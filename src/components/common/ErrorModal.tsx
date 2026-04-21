import {
  Modal as CustomModal,
  CloseModalButton,
  Modal,
} from "@/components/common/CustomModal";
import { AlertTriangle } from "lucide-react";

interface ErrorModalProps {
  onClose: () => void;
  open: boolean;
  description?: string;
  title?: string;
}
const ErrorModal = ({
  onClose,
  open,
  title = "เกิดข้อผิดพลาด",
  description = "กรุณาลองใหม่อีกครั้ง",
}: ErrorModalProps) => {
  return (
    <>
      <Modal
        icon={AlertTriangle}
        showCloseButton={false}
        variant={"warning"}
        titleClassName="text-lg"
        open={open}
        title={title}
        description={description}
        footer={
          <>
            <div className="mt-2 flex justify-center grow">
              <CloseModalButton
                variant={`default`}
                className="max-w-[250px] w-full"
                onClick={() => onClose()}
              >
                ตกลง
              </CloseModalButton>
            </div>
          </>
        }
      ></Modal>
    </>
  );
};

export default ErrorModal;
