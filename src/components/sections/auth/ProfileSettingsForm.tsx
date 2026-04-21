"use client";

import { useId, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  profileSettingsSchema,
  ProfileSettingsFormValues,
} from "@/lib/schema/validationSchema";
import { PutUsersByIdData } from "@/@types/backend-api";
import api from "@/lib/api";

import { cn } from "@/lib/utils";
import { GENDER_LIST } from "@/constant/common";

import { Input } from "@/components/common/CustomInput";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const ProfileSettingsForm = ({
  userId,
  className,
  ...props
}: React.ComponentProps<"form"> & {
  userId: string;
  onSubmit?: () => void;
}) => {
  const {
    watch,
    register,
    handleSubmit,
    control,
    getValues,
    setError,
    formState: { errors, isValid },
  } = useForm<ProfileSettingsFormValues>({
    resolver: zodResolver(profileSettingsSchema),
    mode: "onSubmit",
  });

  const [isPending, startTransition] = useTransition();
  const profileSettingsFormId = useId();

  const genderFormId = useId();
  const dob = watch("dob");
  const today = new Date().toISOString().split("T")[0];

  const handleProfileSettingsSubmit = () => {
    if (!isValid) return;
    const values = getValues();
    startTransition(async () => {
      const requestBody: PutUsersByIdData["requestBody"] = {
        firstName: values.firstName,
        lastName: values.lastName,
        dob: values.dob,
        gender: values.gender,
        phone: values.phone,
      };
      const res = await api.user.updateUser({
        id: userId,
        requestBody,
      });
      if (res.ok) {
        props.onSubmit?.();
      } else {
        setError("root", {
          message: "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
        });
      }
    });
  };

  return (
    <form
      id={profileSettingsFormId}
      onSubmit={handleSubmit(handleProfileSettingsSubmit)}
      noValidate
      className={cn("flex flex-col justify-center gap-4", className)}
      {...props}
    >
      <div className="grid md:grid-cols-2 gap-3">
        <Input
          type="text"
          label="ชื่อจริง"
          placeholder="กรอกชื่อจริง"
          {...register("firstName")}
          autoComplete="given-name"
        />
        <Input
          type="text"
          label="นามสกุล"
          placeholder="กรอกนามสกุล"
          {...register("lastName")}
          autoComplete="family-name"
        />
      </div>

      <Input
        type="date"
        label="วันเกิด"
        {...register("dob")}
        containerClassName="sm:w-60"
        autoComplete="bday"
        max={today}
      />

      <div className={cn("flex flex-col gap-2")}>
        <Label htmlFor={genderFormId}>เพศ</Label>
        <Controller
          key={`gender`}
          name={`gender`}
          control={control}
          render={({ field }) => (
            <RadioGroup
              id={genderFormId}
              onValueChange={field.onChange}
              value={field.value ?? ""}
            >
              {GENDER_LIST.map((genderOption, index) => {
                return (
                  <div
                    key={index}
                    className="flex items-center group gap-2 text-sm font-medium text-gray-700 cursor-pointer aria-[disabled=true]:cursor-not-allowed w-fit"
                  >
                    <RadioGroupItem
                      value={genderOption}
                      id={`${genderOption}-${index}`}
                      className="cursor-pointer"
                    />
                    <Label
                      htmlFor={`${genderOption}-${index}`}
                      className="cursor-[inherit]"
                    >
                      {genderOption}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          )}
        />
      </div>

      <Input
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={10}
        label="เบอร์โทร"
        prefixElement={
          <div className="flex items-center justify-center rounded-l-lg px-3 bg-gray-50 text-gray-600">
            +66
          </div>
        }
        placeholder="0-000-0000"
        autoComplete="tel-national"
        onInput={(e) => {
          const target = e.currentTarget as HTMLInputElement;
          target.value = target.value.replace(/\D/g, "");
        }}
        {...register("phone")}
      />

      <Button type="submit" className="w-full text-sm" disabled={!isValid}>
        ตั้งค่าโปรไฟล์
      </Button>
    </form>
  );
};

export default ProfileSettingsForm;
