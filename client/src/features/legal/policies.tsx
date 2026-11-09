import Link from "next/link";

type PolicySection = { heading: string; paragraphs?: string[]; bullets?: string[] };
type Policy = { slug: string; title: string; summary: string; sections: PolicySection[] };

const policies: Policy[] = [
  {
    slug: "privacy",
    title: "Chính sách bảo mật",
    summary: "Giải thích dữ liệu StudioHub thu thập, mục đích sử dụng, nơi lưu trữ và cách bảo vệ dữ liệu trong phiên bản hiện tại.",
    sections: [
      { heading: "Dữ liệu chúng tôi xử lý", paragraphs: ["Tùy cách bạn sử dụng StudioHub, hệ thống có thể xử lý thông tin tài khoản như họ tên, email, số điện thoại, ảnh đại diện và thông tin hồ sơ Host; thông tin Studio, phòng, thiết bị và bảng giá; nội dung đặt thuê, trao đổi hỗ trợ và dữ liệu kỹ thuật cần thiết để vận hành, bảo vệ dịch vụ.", "Nếu Host gửi hồ sơ pháp lý hoặc tài liệu xác minh, nội dung đó được xem là dữ liệu hạn chế quyền truy cập. Chỉ người có quyền xử lý hồ sơ mới được xem. Không gửi giấy tờ nhạy cảm qua khung chat AI." ] },
      { heading: "Mục đích sử dụng", bullets: ["Tạo và bảo vệ tài khoản, xác thực phiên đăng nhập và phân quyền Customer, Host, Admin.", "Tìm phòng, gửi và quản lý yêu cầu đặt thuê, tính giá, hỗ trợ thực hiện giao dịch sandbox và xử lý tranh chấp.", "Hiển thị thông tin Studio/phòng cho khách; chia sẻ với Host liên quan những thông tin cần thiết để tiếp nhận và thực hiện đơn.", "Vận hành hỗ trợ, phát hiện lỗi, ngăn lạm dụng, lưu dấu vết an ninh và đáp ứng yêu cầu pháp lý hợp lệ.", "Nếu tính năng trợ lý AI được bật, nội dung bạn gửi cho Helpdesk có thể được chuyển tới nhà cung cấp mô hình đã cấu hình để tạo câu trả lời. Tránh gửi mật khẩu, mã xác thực, thông tin thanh toán hoặc giấy tờ định danh vào chat."] },
      { heading: "Lưu trữ và bên nhận dữ liệu", paragraphs: ["Dữ liệu nghiệp vụ được lưu trong cơ sở dữ liệu của ứng dụng. Phiên bản triển khai có thể dùng nhà cung cấp lưu trữ, cơ sở dữ liệu, phân phối ứng dụng và AI để vận hành các chức năng tương ứng. Các nhà cung cấp chỉ nhận dữ liệu cần cho chức năng được gọi; cấu hình và thời hạn thực tế phụ thuộc môi trường triển khai.", "Chúng tôi không bán dữ liệu cá nhân. Dữ liệu chỉ được chia sẻ khi cần để cung cấp dịch vụ, theo yêu cầu hợp pháp, hoặc khi bạn chủ động cho phép."] },
      { heading: "Bảo vệ dữ liệu và giới hạn hiện tại", paragraphs: ["StudioHub áp dụng xác thực, phân quyền, cookie phiên HttpOnly và kiểm soát quyền truy cập hồ sơ. Tuy vậy, phiên bản đồ án hiện chưa có đầy đủ mã hóa tệp định danh, quét mã độc, quy trình lưu trữ dự phòng và thời hạn tự động xóa cho mọi loại hồ sơ. Vì vậy, không tải lên dữ liệu thật nhạy cảm trong môi trường demo."] },
      { heading: "Liên hệ về quyền riêng tư", paragraphs: ["Bạn có thể gửi yêu cầu qua kênh hỗ trợ trên website. Nhóm có thể yêu cầu xác minh quyền sở hữu tài khoản trước khi cung cấp, chỉnh sửa hoặc xóa dữ liệu. Một số dữ liệu có thể cần được giữ lại để hoàn tất đơn, xử lý khiếu nại, bảo vệ quyền lợi hợp pháp hoặc tuân thủ quy định."] },
    ],
  },
  {
    slug: "terms",
    title: "Điều khoản sử dụng",
    summary: "Quy định cơ bản khi Customer, Host và khách truy cập sử dụng StudioHub.",
    sections: [
      { heading: "Phạm vi dịch vụ", paragraphs: ["StudioHub là nền tảng giới thiệu không gian sáng tạo và hỗ trợ quy trình tìm phòng, gửi yêu cầu đặt thuê giữa khách hàng và Host. Thông tin phòng do Host đăng tải; StudioHub không sở hữu hoặc trực tiếp vận hành mọi địa điểm được niêm yết."] },
      { heading: "Tài khoản và hành vi sử dụng", bullets: ["Cung cấp thông tin chính xác, cập nhật thông tin liên hệ và bảo vệ thông tin đăng nhập.", "Không giả mạo, truy cập trái phép, gây gián đoạn hệ thống, thu thập dữ liệu người khác hoặc đăng nội dung vi phạm pháp luật.", "Host chịu trách nhiệm về quyền cung cấp Studio, tính chính xác của hình ảnh, tiện ích, sức chứa, giá và nội quy đã đăng.", "Customer cần kiểm tra thông tin, lịch, giá cuối cùng và chính sách của phòng trước khi xác nhận đặt."] },
      { heading: "Đặt thuê và thanh toán", paragraphs: ["Yêu cầu đặt chỉ được xem là xác nhận theo trạng thái hiển thị trong đơn và phản hồi của Host. Lịch trống, giá và phụ phí cần được kiểm tra tại bước đặt cuối cùng. Bản hiện tại dùng thanh toán sandbox/mô phỏng, không phải cổng thanh toán hoặc cam kết xử lý tiền thật."] },
      { heading: "Nội dung và chấm dứt quyền truy cập", paragraphs: ["Bạn giữ quyền đối với nội dung mình gửi và cho StudioHub quyền giới hạn cần thiết để lưu trữ, hiển thị, hỗ trợ giao dịch và xử lý yêu cầu. StudioHub có thể hạn chế tài khoản khi phát hiện hành vi gây rủi ro, vi phạm điều khoản hoặc theo yêu cầu hợp pháp; việc xử lý cần tuân theo quy trình và lưu vết phù hợp."] },
      { heading: "Cập nhật điều khoản", paragraphs: ["Điều khoản có thể được sửa khi chức năng hoặc quy định thay đổi. Bản đang hiển thị trên website là bản tham chiếu cho phiên bản hiện tại; các thay đổi quan trọng cần được thông báo trước khi áp dụng cho người dùng."] },
    ],
  },
  {
    slug: "cookies",
    title: "Chính sách cookie",
    summary: "Mô tả cookie và bộ nhớ trình duyệt mà website dùng cho phiên đăng nhập, hỗ trợ và tùy chọn giao diện.",
    sections: [
      { heading: "Cookie thiết yếu", paragraphs: ["Cookie studiohub_auth giữ phiên xác thực cần thiết cho các yêu cầu API. Cookie được cấu hình HttpOnly, SameSite=Lax, Secure trên HTTPS và có thời hạn phiên tối đa 2 giờ. Cookie studiohub_helpdesk_session hỗ trợ duy trì cuộc trò chuyện Helpdesk, có thời hạn tối đa 24 giờ và chỉ gửi tới đường dẫn Helpdesk.", "Các cookie này không dùng để theo dõi hoạt động quảng cáo. Tắt cookie thiết yếu có thể làm đăng nhập, quản lý đơn hoặc Helpdesk không hoạt động đúng."] },
      { heading: "Bộ nhớ trong trình duyệt", paragraphs: ["Một số tùy chọn giao diện, trạng thái thanh bên và dữ liệu của chế độ demo có thể được lưu trong localStorage. Bản nháp thông tin đặt có thể được lưu tạm trong sessionStorage để bạn tiếp tục thao tác trong phiên trình duyệt. Đây không phải cookie và có thể xóa trong cài đặt trình duyệt; xóa dữ liệu có thể làm mất bản demo hoặc bản nháp chưa gửi."] },
      { heading: "Cookie phân tích và quảng cáo", paragraphs: ["Phiên bản hiện tại không chủ động đặt cookie quảng cáo hoặc cookie theo dõi liên trang. Nếu StudioHub bổ sung công cụ phân tích hoặc tiếp thị trong tương lai, chính sách và lựa chọn đồng ý sẽ được cập nhật trước khi triển khai."] },
    ],
  },
  {
    slug: "personal-data",
    title: "Chính sách xử lý dữ liệu cá nhân",
    summary: "Các nguyên tắc và cách gửi yêu cầu truy cập, chỉnh sửa, rút lại đồng ý hoặc xóa dữ liệu cá nhân.",
    sections: [
      { heading: "Nguyên tắc xử lý", paragraphs: ["StudioHub chỉ nên xử lý dữ liệu phù hợp với mục đích cung cấp nền tảng, giới hạn quyền truy cập theo vai trò và lưu dữ liệu trong thời gian cần thiết. Việc xử lý dữ liệu nhạy cảm, hồ sơ định danh hoặc chia sẻ cho nhà cung cấp AI cần được cân nhắc riêng và chỉ thực hiện khi chức năng tương ứng được bật."] },
      { heading: "Yêu cầu của bạn", bullets: ["Yêu cầu biết, xem hoặc nhận bản sao dữ liệu gắn với tài khoản.", "Yêu cầu sửa thông tin không chính xác hoặc cập nhật thông tin liên hệ.", "Rút lại sự đồng ý hoặc phản đối/hạn chế một số hoạt động xử lý khi có căn cứ áp dụng.", "Yêu cầu xóa dữ liệu hoặc chấm dứt tài khoản; một số bản ghi giao dịch, an ninh hoặc khiếu nại có thể phải giữ lại theo nghĩa vụ và nhu cầu hợp pháp.", "Gửi phản ánh nếu cho rằng dữ liệu được xử lý sai mục đích hoặc truy cập trái phép."] },
      { heading: "Cách gửi yêu cầu", paragraphs: ["Gửi yêu cầu qua kênh hỗ trợ trên website, nêu email tài khoản, loại yêu cầu và phạm vi dữ liệu liên quan. Không gửi mật khẩu, mã OTP hoặc ảnh giấy tờ qua chat. Nhóm sẽ xác minh danh tính bằng thông tin tối thiểu cần thiết, phản hồi về khả năng xử lý và có thể yêu cầu làm rõ nếu yêu cầu ảnh hưởng tới đơn đang mở hoặc nghĩa vụ lưu trữ."] },
      { heading: "Căn cứ tham khảo", paragraphs: ["Việc xử lý cần được rà soát theo pháp luật Việt Nam hiện hành, trong đó có Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15, có hiệu lực từ ngày 01/01/2026. Đây là trang thông tin của phiên bản đồ án, không thay thế hồ sơ đánh giá tác động hoặc tư vấn pháp lý cho dịch vụ thương mại."] },
    ],
  },
  {
    slug: "disclaimer",
    title: "Chính sách miễn trừ trách nhiệm",
    summary: "Nêu giới hạn của thông tin niêm yết, trợ lý AI, lịch trống và chức năng mô phỏng trong phiên bản hiện tại.",
    sections: [
      { heading: "Thông tin Studio và phòng", paragraphs: ["Thông tin, ảnh, tiện ích, sức chứa, giá và nội quy do Host cung cấp có thể thay đổi. StudioHub cố gắng hiển thị dữ liệu nhận từ hệ thống nhưng không cam kết mọi nội dung do Host đăng luôn đầy đủ, mới nhất hoặc phù hợp mọi mục đích. Khách nên xác nhận chi tiết quan trọng trực tiếp với Host trước khi đến."] },
      { heading: "Tình trạng phòng và đặt thuê", paragraphs: ["Kết quả tìm kiếm không đồng nghĩa phòng còn trống tại thời điểm bạn muốn thuê. Chỉ màn hình kiểm tra lịch và trạng thái đơn mới nhất mới phản ánh kết quả hệ thống; thay đổi đồng thời hoặc sự cố kết nối có thể làm dữ liệu cập nhật chậm."] },
      { heading: "Trợ lý AI", paragraphs: ["Câu trả lời của Helpdesk được tạo tự động và có thể thiếu hoặc sai. Thẻ kết quả phòng là gợi ý để bạn mở trang chi tiết; Helpdesk không tự tạo đơn, xác nhận lịch, cam kết giá hoặc thực hiện thanh toán. Hãy dựa vào dữ liệu hiển thị trong quy trình đặt chính thức."] },
      { heading: "Sẵn sàng dịch vụ và thanh toán", paragraphs: ["Phiên bản đồ án có thể gặp gián đoạn do bảo trì, nhà cung cấp hạ tầng hoặc lỗi mạng. Thanh toán hiện là sandbox/mô phỏng; không nhập thông tin thẻ thật và không xem trạng thái mô phỏng là xác nhận giao dịch tiền thật."] },
      { heading: "Giới hạn theo pháp luật", paragraphs: ["Chính sách này không loại trừ trách nhiệm mà pháp luật không cho phép miễn trừ. Khi xảy ra tranh chấp, các bên cần liên hệ qua kênh hỗ trợ và đối chiếu thông tin đơn, chính sách Host cùng quy định áp dụng."] },
    ],
  },
];

export function LegalPolicies({ slug }: { slug?: string }) {
  const selected = policies.find(policy => policy.slug === slug);
  return <main className="legal-page container" id="main-content">
    <p className="legal-eyebrow">STUDIOHUB · THÔNG TIN DỊCH VỤ</p>
    <h1>{selected?.title ?? "Chính sách & điều khoản"}</h1>
    <p className="legal-intro">{selected?.summary ?? "Thông tin về quyền riêng tư, cách sử dụng dịch vụ và việc xử lý dữ liệu trong StudioHub."}</p>
    <p className="legal-updated">Cập nhật: 09/11/2026 · Áp dụng cho phiên bản StudioHub hiện tại</p>
    {selected ? <>
      <nav className="legal-policy-nav" aria-label="Các chính sách StudioHub">
        {policies.map(policy => <Link key={policy.slug} href={`/policies/${policy.slug}`} aria-current={policy.slug === selected.slug ? "page" : undefined}>{policy.title}</Link>)}
      </nav>
      <article className="legal-document">
        {selected.sections.map(section => <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          {section.bullets && <ul>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul>}
          {selected.slug === "personal-data" && section.heading === "Căn cứ tham khảo" && <p><a href="https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160" target="_blank" rel="noopener noreferrer">Xem Luật số 91/2025/QH15 trên Cổng thông tin văn bản Chính phủ ↗</a></p>}
        </section>)}
      </article>
      <Link className="legal-back" href="/policies">Xem tất cả chính sách</Link>
    </> : <div className="legal-grid">
      {policies.map(policy => <Link className="legal-card" key={policy.slug} href={`/policies/${policy.slug}`}>
        <span>{policy.title}</span><p>{policy.summary}</p><strong>Đọc chính sách <span aria-hidden="true">→</span></strong>
      </Link>)}
    </div>}
  </main>;
}
