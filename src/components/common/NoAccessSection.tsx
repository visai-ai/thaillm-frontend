interface NoAccessSectionProps {
  title?: string;
  description?: string;
  className?: string;
}

export default function NoAccessSection({
  title = "ไม่มีสิทธิ์เข้าถึง",
  description = "หน้านี้สำหรับผู้ดูแลระบบเท่านั้น",
  className = "",
}: NoAccessSectionProps) {
  return (
    <div
      className={`flex items-center justify-center w-full xl:px-8 md:px-6 px-4 xl:py-8 md:py-6 py-4 ${className}`}
    >
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}
