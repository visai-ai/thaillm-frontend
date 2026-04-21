import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Conversation } from "@/stores/useChatStore";
import {
  ActivityIcon,
  AlertTriangleIcon,
  Building2Icon,
  CheckCircle2Icon,
  ClipboardListIcon,
  LightbulbIcon,
  SirenIcon,
} from "lucide-react";

type PrescreenResultProps = {
  id: string;
  conversation: Conversation;
  onSendQuestion?: (question: string) => Promise<void>;
  isLatest?: boolean;
};

type Severity = {
  id: string;
  name: string;
  name_th: string;
  description: string;
};

type Department = {
  id: string;
  name: string;
  name_th: string;
  description: string;
};

type DiagnosisResult = {
  disease_id: string;
  disease_name?: string;
  name_th?: string;
};

const SEVERITY_CONFIG: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    iconBg: string;
    icon: React.ReactNode;
  }
> = {
  sev001: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
    iconBg: "bg-green-100",
    icon: <CheckCircle2Icon className="size-4" />,
  },
  sev002: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
    iconBg: "bg-yellow-100",
    icon: <ActivityIcon className="size-4" />,
  },
  sev002_5: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    iconBg: "bg-orange-100",
    icon: <AlertTriangleIcon className="size-4" />,
  },
  sev003: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    iconBg: "bg-red-100",
    icon: <AlertTriangleIcon className="size-4" />,
  },
};

const DEFAULT_SEVERITY_CONFIG = {
  bg: "bg-gray-50",
  text: "text-gray-700",
  border: "border-gray-200",
  iconBg: "bg-gray-100",
  icon: <ActivityIcon className="size-4" />,
};

export default function PrescreenResult({
  id,
  conversation,
  onSendQuestion,
  isLatest = true,
}: PrescreenResultProps) {
  const meta = conversation.metadata;
  const result = meta?.step;
  if (!result) return null;

  const severity: Severity | null = result.severity;
  const departments: Department[] = result.departments || [];
  const diagnoses: DiagnosisResult[] = result.diagnoses || [];
  const advice: string | null = result.advice || null;
  const terminatedEarly: boolean = result.terminated_early || false;
  const isOutOfScope = terminatedEarly && !severity && departments.length === 0;

  const hasAnyData =
    severity ||
    departments.length > 0 ||
    diagnoses.length > 0 ||
    advice ||
    isOutOfScope;

  const sevConfig = severity
    ? (SEVERITY_CONFIG[severity.id] ?? DEFAULT_SEVERITY_CONFIG)
    : null;

  return (
    <div className="flex flex-col gap-3 py-1">
      {/* Result card */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
          <div className="p-1.5 rounded-lg bg-primary-50">
            <ClipboardListIcon className="size-4 text-primary-500" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">
            ผลการประเมินอาการ
          </h3>
        </div>

        {/* Emergency alert — shown when terminated early WITH severity (actual emergency) */}
        {terminatedEarly && severity && (
          <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5">
            <SirenIcon className="size-4 text-red-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-700">
                พบอาการฉุกเฉิน — กรุณาไปห้องฉุกเฉินทันที
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                ระดับความรุนแรง: {severity.name_th}
              </p>
            </div>
          </div>
        )}

        {/* No data fallback */}
        {!hasAnyData && (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gray-700">
              บันทึกข้อมูลอาการเรียบร้อยแล้ว
            </p>
            <p className="text-sm text-gray-500">
              กรุณาติดต่อโรงพยาบาลเพื่อรับการวินิจฉัยจากแพทย์
            </p>
          </div>
        )}

        {/* Severity — only shown when NOT terminated early (emergency merges it into the alert) */}
        {!terminatedEarly && severity && sevConfig && (
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2.5",
              sevConfig.bg,
              sevConfig.border,
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-lg shrink-0",
                sevConfig.iconBg,
                sevConfig.text,
              )}
            >
              {sevConfig.icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">ระดับความรุนแรง</p>
              <p className={cn("text-sm font-semibold", sevConfig.text)}>
                {severity.name_th}
              </p>
              {severity.description && (
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                  {severity.description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Departments */}
        {departments.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <Building2Icon className="size-3.5 text-gray-400 shrink-0" />
              <span className="text-xs font-medium text-gray-500">
                แผนกที่แนะนำ
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {departments.map((dept) => (
                <span
                  key={dept.id}
                  className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-xs font-medium"
                >
                  {dept.name_th}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Diagnoses */}
        {diagnoses.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <ActivityIcon className="size-3.5 text-gray-400 shrink-0" />
              <span className="text-xs font-medium text-gray-500">
                การวินิจฉัยเบื้องต้น
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {diagnoses.map((d, i) => (
                <div key={d.disease_id} className="flex items-start gap-2">
                  <span className="text-xs text-gray-400 mt-0.5 shrink-0 w-4">
                    {i + 1}.
                  </span>
                  <span className="text-sm text-gray-700">
                    {d.name_th || d.disease_name || d.disease_id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Out-of-scope notice */}
        {isOutOfScope && (
          <div className="flex flex-col gap-1 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2.5">
            <p className="text-sm font-medium text-gray-700">
              ไม่พบอาการที่ตรงกับรายการในระบบ
            </p>
            <p className="text-xs text-gray-500">
              ระบบยังไม่รองรับการคัดกรองอาการนี้
              กรุณาปรึกษาแพทย์เพื่อรับการวินิจฉัยเพิ่มเติม
            </p>
          </div>
        )}

        {/* Advice */}
        {advice && (
          <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2.5">
            <LightbulbIcon className="size-4 text-blue-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-blue-600 mb-0.5">
                คำแนะนำในการดูแลตัวเอง
              </p>
              <p className="text-sm text-blue-700 whitespace-pre-line">
                {advice}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {isLatest && conversation.options && (
        <div className="flex flex-wrap gap-2">
          {conversation.options.map((option) => {
            const value = option.value || option.label;
            return (
              <Button
                key={`${value}-${id}`}
                variant="secondary"
                size="sm"
                onClick={() => {
                  onSendQuestion?.(value);
                }}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
