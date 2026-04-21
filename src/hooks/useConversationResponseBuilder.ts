import { useState } from "react";

export enum ConversationFlowType {
  Prescreening = "prescreening",
  MedicineScheduling = "medicine_scheduling",
  MedicalAppointment = "medical_appointment",
  InformationQuery = "information_query",
  EmergencyContacts = "emergency_contacts",
}

export type PrescreenStep = {
  type: "questions" | "llm_questions";
  phase: number;
  phase_name?: string;
  questions?: any[];
  totalPhases?: number;
};

export const useConversationResponseBuilder = () => {
  const [showEditMedicalReminderModal, setShowEditMedicalReminderModal] =
    useState<boolean>(false);
  const [showAddMedicalReminderModal, setShowAddMedicalReminderModal] =
    useState<boolean>(false);
  const [showAddAppointmentsModal, setShowAddAppointmentsModal] =
    useState<boolean>(false);
  const [showEditAppointmentModal, setShowEditAppointmentModal] =
    useState<boolean>(false);
  const [pendingToolCallId, setPendingToolCallId] = useState<string | null>(
    null,
  );
  const [prescreenPendingId, setPrescreenPendingId] = useState<string | null>(
    null,
  );
  const [showPrescreenModal, setShowPrescreenModal] = useState(false);
  const [prescreenStep, setPrescreenStep] = useState<PrescreenStep | null>(
    null,
  );

  return {
    // Modal state and setters
    showAddMedicalReminderModal,
    setShowAddMedicalReminderModal,
    showAddAppointmentsModal,
    setShowAddAppointmentsModal,
    showEditMedicalReminderModal,
    setShowEditMedicalReminderModal,
    showEditAppointmentModal,
    setShowEditAppointmentModal,
    pendingToolCallId,
    setPendingToolCallId,
    prescreenPendingId,
    setPrescreenPendingId,
    showPrescreenModal,
    setShowPrescreenModal,
    prescreenStep,
    setPrescreenStep,
  };
};
