import { Control } from "react-hook-form";
import SwitchSection from "@/components/sections/settings/SwitchSection";
import { ProfileSchema } from "@/lib/schema/profileSchema";
import { CookieSettings } from "@/lib/utils/cookieUtils";

export const cookieConfigs = [
  {
    name: "cookieRequire" as keyof CookieSettings,
    label: "คุกกี้ที่จำเป็น",
    description:
      "คุกกี้นี้จำเป็นสำหรับการทำงานของเว็บไซต์และไม่สามารถปิดได้ เพื่อให้คุณสามารถใช้งานเว็บไซต์และเข้าถึงฟีเจอร์พื้นฐานได้อย่างถูกต้อง",
    disabled: true,
  },
  {
    name: "cookieAnalytic" as keyof CookieSettings,
    label: "คุกกี้ในส่วนวิเคราะห์",
    description:
      "คุกกี้ในส่วนวิเคราะห์จะช่วยให้เข้าใจรูปแบบการใช้งานของผู้เข้าชมปละจะช่วยปรับปรุงประสบการณ์การใช้งาน โดยการเก็บรวบรวมข้อมูลและรายงานผลการใช้งานของผู้ใช้งาน",
    disabled: false,
  },
  {
    name: "cookieMarketing" as keyof CookieSettings,
    label: "คุกกี้ในส่วนการตลาด",
    description:
      "คุกกี้ในส่วนการตลาดใช้เพื่อติดตามพฤติกรรมผู้เข้าชมเว็บไซต์เพื่อแสดงโฆษณาที่เหมาะสมสำหรับผู้ใช้งานแต่ละรายและเพื่อเพิ่มประสิทธิผลการโฆษณาสำหรับผู้เผยแพร่และผู้โฆษณาสำหรับผู้เผย แพร่และผู้โฆษณาสำหรับบุคคลที่สาม",
    disabled: false,
  },
];

export const CookieSection = ({
  control,
}: {
  control: Control<ProfileSchema>;
}) => {
  return (
    <SwitchSection
      id={"cookie-section"}
      control={control}
      configs={cookieConfigs}
    />
  );
};
