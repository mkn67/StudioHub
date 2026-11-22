export type TeamMember = {
  id: number;
  name: string;
  studentId?: string;
  role?: string;
  description?: string;
  /** Đặt ảnh trong client/public/images/team, dùng đường dẫn /images/team/ten-anh.jpg. */
  image?: string;
  github?: string;
  email?: string;
  /** Chỉ bật khi thành viên đồng ý công khai email. */
  emailPublic?: boolean;
};

/** Thay thông tin trực tiếp ở đây. Không cần API hoặc cơ sở dữ liệu. */
export const teamMembers: TeamMember[] = [
  { id: 1, name: "Mai Kỳ" },
  { id: 2, name: "Thu Diễm" },
  { id: 3, name: "Minh Ánh" },
  { id: 4, name: "Thiên Lộc" },
  { id: 5, name: "Đức Lộc" },
];
