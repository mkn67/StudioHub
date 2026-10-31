#!/usr/bin/env python3
"""
Phase 6 Concurrency Test Suite (T1, T2, T15)
Uses threading.Barrier to fire concurrent HTTP requests simultaneously.
"""

import json
import re
import sys
import threading
import urllib.error
import urllib.request

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"


def login(email, password):
    url = f"{BASE_URL}/api/auth/login"
    payload = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        url, data=payload, headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return data["data"]["token"]


def send_booking_request(token, payload):
    url = f"{BASE_URL}/api/bookings"
    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=req_data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            code = resp.getcode()
            body = json.loads(resp.read().decode("utf-8"))
            return {"code": code, "body": body}
    except urllib.error.HTTPError as e:
        body = json.loads(e.read().decode("utf-8"))
        return {"code": e.code, "body": body}
    except Exception as e:
        return {"code": 500, "error": str(e)}


def send_payment_request(token, booking_id):
    url = f"{BASE_URL}/api/bookings/{booking_id}/payments"
    req_data = json.dumps({"payment_type": "deposit"}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=req_data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return {"code": resp.getcode(), "body": json.loads(resp.read().decode("utf-8"))}
    except urllib.error.HTTPError as e:
        return {"code": e.code, "body": json.loads(e.read().decode("utf-8"))}
    except Exception as e:
        return {"code": 500, "error": str(e)}


def test_t1_concurrent_room_booking(token):
    print("\n--- Testing T1: 2 Concurrent Booking Requests for Same Room & Time ---")
    barrier = threading.Barrier(2)
    results = [None, None]

    payload = {
        "room_id": 1,
        "rate_id": 1,
        "start_time": "2027-01-10 09:00:00",
        "end_time": "2027-01-10 12:00:00",
        "party_size": 2,
    }

    def worker(idx):
        barrier.wait()
        results[idx] = send_booking_request(token, payload)

    t1 = threading.Thread(target=worker, args=(0,))
    t2 = threading.Thread(target=worker, args=(1,))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    codes = [r["code"] for r in results]
    print(f"  Results: thread 0 -> {results[0]['code']}, thread 1 -> {results[1]['code']}")

    success_count = codes.count(201)
    conflict_count = codes.count(409)

    error_codes = []
    for r in results:
        if r["code"] == 409:
            errs = r.get("body", {}).get("errors", [])
            if errs:
                error_codes.append(errs[0].get("code"))

    ok = (
        success_count == 1
        and conflict_count == 1
        and ("room_occupied" in error_codes)
    )
    if ok:
        print("  [PASS] T1: Exactly 1 request succeeded (201), the other received 409 room_occupied")
        return True
    else:
        print(f"  [FAIL] T1: Expected [201, 409 room_occupied], got {codes} with error codes {error_codes}")
        return False


def test_t2_concurrent_equipment_stock(token):
    print("\n--- Testing T2: 2 Concurrent Requests Competing for Stock = 2 Across 2 Rooms ---")
    barrier = threading.Barrier(2)
    results = [None, None]

    # Equipment 4 ('Ghế Sofa Da Chesterfield Vintage') in Studio 1 has total_quantity = 2.
    # Room 1 and Room 2 both belong to Studio 1.
    payload1 = {
        "room_id": 1,
        "rate_id": 1,
        "start_time": "2027-01-11 09:00:00",
        "end_time": "2027-01-11 12:00:00",
        "equipments": [{"equipment_id": 4, "quantity": 2}],
    }
    payload2 = {
        "room_id": 2,
        "rate_id": 6,
        "start_time": "2027-01-11 09:00:00",
        "end_time": "2027-01-11 12:00:00",
        "equipments": [{"equipment_id": 4, "quantity": 2}],
    }

    def worker(idx, payload):
        barrier.wait()
        results[idx] = send_booking_request(token, payload)

    t1 = threading.Thread(target=worker, args=(0, payload1))
    t2 = threading.Thread(target=worker, args=(1, payload2))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    codes = [r["code"] for r in results]
    print(f"  Results: Room 1 -> {results[0]['code']}, Room 2 -> {results[1]['code']}")

    success_count = codes.count(201)
    conflict_count = codes.count(409)

    error_codes = []
    for r in results:
        if r["code"] == 409:
            errs = r.get("body", {}).get("errors", [])
            if errs:
                error_codes.append(errs[0].get("code"))

    ok = (
        success_count == 1
        and conflict_count == 1
        and ("equipment_insufficient" in error_codes)
    )
    if ok:
        print("  [PASS] T2: Exactly 1 request succeeded (201), the other received 409 equipment_insufficient")
        return True
    else:
        print(f"  [FAIL] T2: Expected [201, 409 equipment_insufficient], got {codes} with errors {error_codes}")
        return False


def test_t15_concurrent_distinct_bookings(token):
    print("\n--- Testing T15: >= 10 Concurrent Booking Requests Across Different Slots/Rooms ---")
    n = 12
    barrier = threading.Barrier(n)
    results = [None] * n

    # Generate 12 distinct non-overlapping booking requests
    # 3 on room 1, 3 on room 2, 3 on room 4, 3 on room 5 on distinct days in 2027
    payloads = []
    for i in range(n):
        day = 1 + i
        room_id = [1, 2, 4, 5][i % 4]
        rate_id = [1, 6, 9, 13][i % 4]
        payloads.append({
            "room_id": room_id,
            "rate_id": rate_id,
            "start_time": f"2027-02-{day:02d} 09:00:00",
            "end_time": f"2027-02-{day:02d} 11:00:00",
            "party_size": 2,
        })

    def worker(idx):
        barrier.wait()
        results[idx] = send_booking_request(token, payloads[idx])

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(n)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    codes = [r["code"] for r in results]
    print(f"  Received status codes: {codes}")

    all_201 = all(c == 201 for c in codes)
    booking_codes = []
    for r in results:
        bcode = r.get("body", {}).get("data", {}).get("booking_code", "")
        booking_codes.append(bcode)

    all_format_ok = all(
        re.match(r"^BK-\d{8}-\d{4}$", c) and not c.startswith("TMP-")
        for c in booking_codes
    )
    unique_codes = len(set(booking_codes)) == len(booking_codes)

    print(f"  Generated booking codes (first 4): {booking_codes[:4]} ...")

    if all_201 and all_format_ok and unique_codes:
        print(f"  [PASS] T15: All {n} concurrent requests succeeded (201), unique codes BK-YYYYMMDD-NNNN, no TMP-")
        return True
    else:
        print(f"  [FAIL] T15: all_201={all_201}, all_format_ok={all_format_ok}, unique_codes={unique_codes}")
        return False


def test_t16_concurrent_deposit(token):
    print("\n--- Testing T16: Two Concurrent Deposit Payments for One Booking ---")
    created = send_booking_request(token, {
        "room_id": 1,
        "rate_id": 1,
        "start_time": "2027-03-20 09:00:00",
        "end_time": "2027-03-20 11:00:00",
    })
    booking_id = created.get("body", {}).get("data", {}).get("booking_id")
    if created.get("code") != 201 or not booking_id:
        print(f"  [FAIL] Could not create the payment test booking: {created}")
        return False

    barrier = threading.Barrier(2)
    results = [None, None]

    def worker(idx):
        barrier.wait()
        results[idx] = send_payment_request(token, booking_id)

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    codes = [result["code"] for result in results]
    error_codes = []
    for result in results:
        errors = result.get("body", {}).get("errors", [])
        if result["code"] == 409 and errors:
            error_codes.append(errors[0].get("code"))
    detail_req = urllib.request.Request(
        f"{BASE_URL}/api/bookings/{booking_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(detail_req) as response:
        detail = json.loads(response.read().decode("utf-8"))
    payments = detail.get("data", {}).get("payments", [])
    ok = codes.count(201) == 1 and codes.count(409) == 1 and \
        "payment_duplicate" in error_codes and len(payments) == 1 and \
        payments[0].get("status") == "success"
    if ok:
        print("  [PASS] T16: One payment succeeded, one returned 409 payment_duplicate, and one success payment is stored")
        return True
    print(f"  [FAIL] T16: codes={codes}, errors={error_codes}, stored_success_payments={len(payments)}")
    return False


def main():
    print("=== STARTING CONCURRENCY TESTS (T1, T2, T15, T16) ===")
    print(f"Target: {BASE_URL}")

    token = login("customer@studio.local", "password123")
    print("  Customer logged in successfully.")

    t1_ok = test_t1_concurrent_room_booking(token)
    t2_ok = test_t2_concurrent_equipment_stock(token)
    t15_ok = test_t15_concurrent_distinct_bookings(token)
    t16_ok = test_t16_concurrent_deposit(token)

    print("\n==============================================")
    if t1_ok and t2_ok and t15_ok and t16_ok:
        print(">>> ALL CONCURRENCY TESTS PASSED 100% <<<")
        sys.exit(0)
    else:
        print(">>> CONCURRENCY TESTS FAILED <<<")
        sys.exit(1)


if __name__ == "__main__":
    main()
