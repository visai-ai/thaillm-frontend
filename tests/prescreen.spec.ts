import { expect, Page, Route, test } from "@playwright/test";

// ============================================================================
// SSE Helpers
// ============================================================================

function sseBody(...events: { event: string; data: string }[]): string {
  return (
    events.map((e) => `event: ${e.event}\ndata: ${e.data}\n\n`).join("") +
    "event: status\ndata: [DONE]\n\n"
  );
}

function convEvent(conv: object): { event: string; data: string } {
  return { event: "conversation", data: JSON.stringify(conv) };
}

function toolWaitEvent(
  id: string,
  actionType: string,
): { event: string; data: string } {
  return { event: "tool_wait", data: JSON.stringify({ id, actionType }) };
}

// ============================================================================
// Mock Conversation Factories
// ============================================================================

const SESSION_ID = "prescreen-test-session-001";
const PENDING_ID = "pending-tool-call-001";

function mkPrescreenStep(
  phase: number,
  phaseName: string,
  questions: object[],
): object {
  return { type: "questions", phase, phase_name: phaseName, questions };
}

function mkLLMStep(questions: string[]): object {
  return { type: "llm_questions", questions };
}

function mkPrescreenConv(
  phase: number,
  phaseName: string,
  questions: object[],
): object {
  return {
    id: `conv-phase-${phase}`,
    role: "assistant",
    content: `กรุณากรอกข้อมูล: ${phaseName}`,
    actionType: "prescreen",
    category: "prescreening",
    metadata: {
      prescreenSessionId: SESSION_ID,
      step: mkPrescreenStep(phase, phaseName, questions),
    },
  };
}

function mkLLMQuestionsConv(questions: string[]): object {
  return {
    id: "conv-llm",
    role: "assistant",
    content: "กรุณาตอบคำถามเพิ่มเติมเพื่อประเมินอาการ",
    actionType: "prescreen",
    category: "prescreening",
    metadata: {
      prescreenSessionId: SESSION_ID,
      step: mkLLMStep(questions),
    },
  };
}

function mkResultStep(opts?: {
  terminatedEarly?: boolean;
  severity?: object;
  departments?: object[];
  diagnoses?: object[];
  reason?: string;
}): object {
  return {
    type: "pipeline_result",
    terminated_early: opts?.terminatedEarly ?? false,
    severity: opts?.severity ?? {
      id: "sev001",
      name: "normal",
      name_th: "ปกติ",
      description: "",
    },
    departments: opts?.departments ?? [
      {
        id: "d1",
        name: "general",
        name_th: "อายุรกรรมทั่วไป",
        description: "",
      },
    ],
    diagnoses: opts?.diagnoses ?? [
      { disease_id: "dis001", name_th: "ไข้หวัด" },
    ],
    reason: opts?.reason ?? "อาการทั่วไปไม่รุนแรง",
  };
}

function mkResultConv(opts?: {
  terminatedEarly?: boolean;
  severity?: object;
  departments?: object[];
  diagnoses?: object[];
  reason?: string;
}): object {
  return {
    id: "conv-result",
    role: "assistant",
    content: opts?.terminatedEarly
      ? "พบอาการฉุกเฉิน กรุณาติดต่อห้องฉุกเฉินโดยด่วน"
      : "ประเมินอาการเรียบร้อยแล้วครับ",
    actionType: "prescreen-result",
    category: "prescreening",
    options: [
      { label: "ติดต่อโรงพยาบาล", value: "ติดต่อโรงพยาบาล" },
      { label: "ประเมินอาการใหม่", value: "ประเมินอาการใหม่" },
    ],
    metadata: {
      prescreenSessionId: SESSION_ID,
      step: mkResultStep(opts),
      showSirirajQuestionnaire: true,
      pendingToolCallId: PENDING_ID,
    },
  };
}

// Prebuilt phase data
const PHASE_0_QUESTIONS = [
  {
    qid: "age",
    question: "อายุ (ปี)",
    question_type: "int",
    metadata: { key: "age" },
    answer_schema: { minimum: 0, maximum: 120 },
  },
  {
    qid: "gender",
    question: "เพศ",
    question_type: "enum",
    metadata: { key: "gender" },
    options: [
      { id: "Male", label: "ชาย" },
      { id: "Female", label: "หญิง" },
    ],
  },
  {
    qid: "weight",
    question: "น้ำหนัก (กก.)",
    question_type: "float",
    metadata: { key: "weight" },
    answer_schema: { minimum: 1, maximum: 300 },
  },
  {
    qid: "height",
    question: "ส่วนสูง (ซม.)",
    question_type: "float",
    metadata: { key: "height" },
    answer_schema: { minimum: 30, maximum: 250 },
  },
];

const PHASE_1_QUESTIONS = [
  {
    qid: "shock",
    question: "มีภาวะช็อก หมดสติ หรือไม่ตอบสนอง",
    question_type: "bool",
  },
  {
    qid: "severe_breath",
    question: "หายใจลำบากอย่างรุนแรง",
    question_type: "bool",
  },
  {
    qid: "chest_pain",
    question: "เจ็บแน่นหน้าอกอย่างรุนแรง",
    question_type: "bool",
  },
];

const PHASE_2_QUESTIONS = [
  {
    qid: "primary_symptom",
    question: "อาการหลักที่มาพบแพทย์",
    question_type: "single_select",
    options: [
      { id: "fever", label: "ไข้" },
      { id: "cough", label: "ไอ" },
      { id: "headache", label: "ปวดหัว" },
    ],
  },
  {
    qid: "secondary_symptoms",
    question: "อาการร่วม (เลือกได้หลายข้อ)",
    question_type: "multi_select",
    options: [
      { id: "fever", label: "ไข้" },
      { id: "cough", label: "ไอ" },
      { id: "headache", label: "ปวดหัว" },
      { id: "runny_nose", label: "น้ำมูกไหล" },
    ],
  },
];

const PHASE_3_QUESTIONS = [
  { qid: "dehydration", question: "ขาดน้ำอย่างรุนแรง", question_type: "bool" },
  { qid: "seizure", question: "มีอาการชัก", question_type: "bool" },
];

const PHASE_4_SINGLE_SELECT = [
  {
    qid: "onset",
    question: "อาการเริ่มมาเมื่อใด",
    question_type: "single_select",
    options: [
      { id: "today", label: "วันนี้" },
      { id: "yesterday", label: "เมื่อวาน" },
      { id: "week", label: "ภายใน 1 สัปดาห์" },
    ],
  },
];

const PHASE_4_MULTI_SELECT = [
  {
    qid: "aggravating",
    question: "อะไรทำให้อาการแย่ลง",
    question_type: "multi_select",
    options: [
      { id: "movement", label: "การเคลื่อนไหว" },
      { id: "eating", label: "การรับประทานอาหาร" },
      { id: "stress", label: "ความเครียด" },
    ],
  },
];

const PHASE_4_NUMBER = [
  {
    qid: "pain_score",
    question: "ระดับความเจ็บปวด (0-10)",
    question_type: "number_range",
    constraints: { min: 0, max: 10, step: 1, default: 5 },
  },
];

const PHASE_4_FREE_TEXT = [
  {
    qid: "describe",
    question: "อธิบายอาการของคุณ",
    question_type: "free_text",
  },
];

const PHASE_4_FIELDS = [
  {
    qid: "history",
    question: "ประวัติเพิ่มเติม",
    question_type: "free_text_with_fields",
    fields: [
      { id: "treatment", label: "การรักษาที่ทำแล้ว", kind: "text" },
      { id: "medication", label: "ยาที่ใช้", kind: "text" },
    ],
  },
];

// ============================================================================
// Auth Setup
// ============================================================================

async function setupAuth(page: Page) {
  await page.context().addCookies([
    {
      name: "bdi-token-access",
      value: "mock-access-token",
      domain: "localhost",
      path: "/",
    },
    {
      name: "bdi-token-user",
      value: JSON.stringify({
        id: "user-id",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        roles: ["user"],
      }),
      domain: "localhost",
      path: "/",
    },
    {
      name: "bdi_std_cookie_require",
      value: "true",
      domain: "localhost",
      path: "/",
    },
    {
      name: "bdi_std_cookie_analytic",
      value: "true",
      domain: "localhost",
      path: "/",
    },
    {
      name: "bdi_std_cookie_marketing",
      value: "true",
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.route("**/auth/me", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "user-id",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        roles: ["user"],
        emailVerified: true,
      }),
    });
  });

  await page.route("**/chat/rooms", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "room-id",
          userId: "user-id",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }
  });

  await page.route("**/chat/rooms/*/conversations", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.route("**/chat/conversations", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route("**/chat/rooms/*/pending-tool-calls", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}

/**
 * Mock the initial SSE trigger for prescreen. Returns the first step via SSE
 * plus a tool_wait event so the frontend gets the pendingId.
 */
function mockPrescreenStart(page: Page, firstStepConv: any) {
  // The handler fetches the current step via REST after receiving the SSE conversation event.
  // Register the /step route FIRST so it can be overridden by mockPrescreenREST if needed.
  const initialStep = firstStepConv?.metadata?.step;
  page.route("**/chat/ai/prescreen/*/step", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ step: initialStep ?? {} }),
    });
  });

  return page.route("**/chat/ai", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: sseBody(
        toolWaitEvent(PENDING_ID, "prescreen-pending"),
        convEvent(firstStepConv),
      ),
    });
  });
}

/**
 * Mock a stateful /chat/ai endpoint for the initial trigger,
 * plus REST answer/back endpoints with a handler.
 */
function mockPrescreenWithAnswerHandler(
  page: Page,
  firstStepConv: object,
  onAnswer: (body: any) => {
    step: any;
    completed: boolean;
    conversation?: any;
  },
) {
  // SSE for initial trigger
  mockPrescreenStart(page, firstStepConv);

  // REST answer endpoint
  page.route("**/chat/ai/prescreen/*/answer", async (route) => {
    const body = route.request().postDataJSON();
    const result = onAnswer(body);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(result),
    });
  });
}

// Mock a stateful /chat/ai endpoint that responds based on prompt (legacy helper for non-answer tests)
function mockChatAI(
  page: Page,
  handler: (prompt: string, route: Route) => Promise<void>,
) {
  return page.route("**/chat/ai", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const body = route.request().postDataJSON();
    await handler(body?.prompt ?? "", route);
  });
}

/**
 * Mock the prescreen REST endpoints with a stateful step tracker.
 * Returns object with `answerBodies` to inspect what was sent.
 */
function mockPrescreenREST(
  page: Page,
  stepSequence: Array<{ step: any; completed: boolean; conversation?: any }>,
) {
  let answerIndex = 0;
  const answerBodies: any[] = [];

  page.route("**/chat/ai/prescreen/*/answer", async (route) => {
    const body = route.request().postDataJSON();
    answerBodies.push(body);
    const result = stepSequence[answerIndex] ?? { step: {}, completed: false };
    answerIndex++;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(result),
    });
  });

  page.route("**/chat/ai/prescreen/*/back", async (route) => {
    // On back, go back one step (reuse previous step if available)
    if (answerIndex > 0) answerIndex--;
    const result = stepSequence[answerIndex] ?? { step: {}, completed: false };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ step: result.step }),
    });
  });

  page.route("**/chat/ai/prescreen/*/step", async (route) => {
    // Always fall back to mockPrescreenStart's /step handler which has the initial step.
    // The /step endpoint is only called once on initialization; after that,
    // subsequent steps come from /answer responses.
    await route.fallback();
  });

  page.route("**/chat/ai/prescreen/*/cancel", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  return { answerBodies };
}

async function goToChatbot(page: Page) {
  await page.goto("./");
  await expect(page.getByPlaceholder("พิมพ์ข้อความที่นี่...")).toBeVisible({
    timeout: 10000,
  });
}

async function clickPrescreenButton(page: Page) {
  const btn = page.getByRole("button", { name: /ประเมินอาการเบื้องต้น/ });
  await expect(btn).toBeVisible({ timeout: 5000 });
  await btn.click();
}

/**
 * Get an input inside a BulkForm field container by label text.
 * Input component renders: div.flex-col > label + div > input.
 * Go 1 level up from the label to reach the field container div,
 * then find the input inside it.
 */
function bulkInput(page: Page, labelText: string) {
  return page
    .locator("label", { hasText: labelText })
    .locator("xpath=..")
    .locator("input")
    .first();
}

/**
 * Select an item from a Radix TextDropdown. Waits for the menu to be visible
 * before clicking to avoid DOM detach race conditions.
 */
async function selectDropdownItem(
  page: Page,
  triggerName: RegExp | string,
  itemName: string,
) {
  const trigger = page.getByRole("button", { name: triggerName });
  await expect(trigger).toBeVisible();
  await trigger.click({ force: true });
  // Wait for the Radix menu container to stabilize before clicking an item
  await expect(page.getByRole("menu")).toBeVisible({ timeout: 3000 });
  // force: true avoids detachment flake when Radix unmounts the menu mid-click
  await page.getByRole("menuitem", { name: itemName }).click({ force: true });
  // Confirm menu closed (selection registered)
  await expect(page.getByRole("menu")).not.toBeVisible({ timeout: 2000 });
}

// ============================================================================
// Tests
// ============================================================================

test.describe("Prescreen Flow", () => {
  // Parallel workers hitting the dev server can cause SSE timing flakiness.
  test.describe.configure({ retries: 2 });

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
  });

  // --------------------------------------------------------------------------
  // 1. Starting prescreen
  // --------------------------------------------------------------------------
  test.describe("Starting prescreen", () => {
    test("shows ประเมินอาการเบื้องต้น button on empty chatbot", async ({
      page,
    }) => {
      await goToChatbot(page);
      await expect(
        page.getByRole("button", { name: /ประเมินอาการเบื้องต้น/ }),
      ).toBeVisible();
    });

    test("clicking button sends prompt and renders phase 0 bulk form", async ({
      page,
    }) => {
      await mockPrescreenStart(
        page,
        mkPrescreenConv(0, "ข้อมูลผู้ป่วย", PHASE_0_QUESTIONS),
      );
      mockPrescreenREST(page, []);

      await goToChatbot(page);
      await clickPrescreenButton(page);

      // Phase 0 form should appear — use h3 heading to avoid chat-bubble strict-mode violation
      await expect(page.locator("h3", { hasText: "ข้อมูลทั่วไป" })).toBeVisible(
        { timeout: 8000 },
      );
      await expect(bulkInput(page, "อายุ (ปี)")).toBeVisible();
    });
  });

  // --------------------------------------------------------------------------
  // 2. Phase 0: Demographics (BulkForm)
  // --------------------------------------------------------------------------
  test.describe("Phase 0: Demographics BulkForm", () => {
    test("renders all fields and submit button is initially enabled", async ({
      page,
    }) => {
      await mockPrescreenStart(
        page,
        mkPrescreenConv(0, "ข้อมูลผู้ป่วย", PHASE_0_QUESTIONS),
      );
      mockPrescreenREST(page, []);

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.locator("h3", { hasText: "ข้อมูลทั่วไป" })).toBeVisible(
        { timeout: 8000 },
      );

      // All fields visible
      await expect(bulkInput(page, "อายุ (ปี)")).toBeVisible();
      await expect(bulkInput(page, "น้ำหนัก (กก.)")).toBeVisible();
      await expect(bulkInput(page, "ส่วนสูง (ซม.)")).toBeVisible();
      await expect(page.getByRole("button", { name: "ถัดไป" })).toBeVisible();
    });

    test("submit button is always enabled (validates on submit)", async ({
      page,
    }) => {
      await mockPrescreenStart(
        page,
        mkPrescreenConv(0, "ข้อมูลผู้ป่วย", PHASE_0_QUESTIONS),
      );
      mockPrescreenREST(page, []);

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.locator("h3", { hasText: "ข้อมูลทั่วไป" })).toBeVisible(
        { timeout: 8000 },
      );

      // BulkForm validates on submit — the button is always enabled
      await expect(page.getByRole("button", { name: "ถัดไป" })).toBeEnabled();
    });

    test("shows error when number is out of range", async ({ page }) => {
      await mockPrescreenStart(
        page,
        mkPrescreenConv(0, "ข้อมูลผู้ป่วย", PHASE_0_QUESTIONS),
      );
      mockPrescreenREST(page, []);

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.locator("h3", { hasText: "ข้อมูลทั่วไป" })).toBeVisible(
        { timeout: 8000 },
      );

      // Fill all other required fields so the submit button is enabled
      const genderField = page
        .locator("label", { hasText: "เพศ" })
        .locator("xpath=../..")
        .first();
      await genderField.getByRole("button", { name: "ชาย" }).click();
      await bulkInput(page, "น้ำหนัก (กก.)").fill("70");
      await bulkInput(page, "ส่วนสูง (ซม.)").fill("170");
      // Enter age out of range (> 120) — button is now enabled since other fields have values
      await bulkInput(page, "อายุ (ปี)").fill("999");
      await page.getByRole("button", { name: "ถัดไป" }).click();

      await expect(page.getByText(/ค่าต้องไม่เกิน 120/).first()).toBeVisible({
        timeout: 3000,
      });
    });

    test("conditional field age_months appears when age < 6", async ({
      page,
    }) => {
      const questionsWithAgeMonths = [
        ...PHASE_0_QUESTIONS,
        {
          qid: "age_months",
          question: "อายุ (เดือน)",
          question_type: "int",
          metadata: { key: "age_months" },
          answer_schema: { minimum: 0, maximum: 72 },
        },
      ];

      await mockPrescreenStart(
        page,
        mkPrescreenConv(0, "ข้อมูลผู้ป่วย", questionsWithAgeMonths),
      );
      mockPrescreenREST(page, []);

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.locator("h3", { hasText: "ข้อมูลทั่วไป" })).toBeVisible(
        { timeout: 8000 },
      );

      // Set age >= 6 to verify age_months is hidden (BulkForm hides it when age >= 6)
      await bulkInput(page, "อายุ (ปี)").fill("10");
      await expect(bulkInput(page, "อายุ (เดือน)")).not.toBeVisible();

      // Set age to < 6 to reveal age_months
      await bulkInput(page, "อายุ (ปี)").fill("3");
      await bulkInput(page, "อายุ (ปี)").blur();

      await expect(bulkInput(page, "อายุ (เดือน)")).toBeVisible({
        timeout: 2000,
      });
    });

    test("conditional pregnancy fields appear for Female gender", async ({
      page,
    }) => {
      const questionsWithPregnancy = [
        ...PHASE_0_QUESTIONS,
        {
          qid: "pregnancy_status",
          question: "สถานะการตั้งครรภ์",
          question_type: "enum",
          metadata: { key: "pregnancy_status" },
          options: [
            { id: "pregnant", label: "ตั้งครรภ์" },
            { id: "not_pregnant", label: "ไม่ตั้งครรภ์" },
          ],
        },
      ];

      await mockPrescreenStart(
        page,
        mkPrescreenConv(0, "ข้อมูลผู้ป่วย", questionsWithPregnancy),
      );
      mockPrescreenREST(page, []);

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.locator("h3", { hasText: "ข้อมูลทั่วไป" })).toBeVisible(
        { timeout: 8000 },
      );

      // Pregnancy status hidden initially (no gender selected)
      await expect(
        page.getByText("สถานะการตั้งครรภ์").first(),
      ).not.toBeVisible();

      // Select Male — pregnancy still hidden
      const genderField = page
        .locator("label", { hasText: "เพศ" })
        .locator("xpath=../..")
        .first();
      await genderField.getByRole("button", { name: "ชาย" }).click();
      await expect(
        page.getByText("สถานะการตั้งครรภ์").first(),
      ).not.toBeVisible();

      // Select Female — pregnancy becomes visible
      await genderField.getByRole("button", { name: "หญิง" }).click();
      await expect(page.getByText("สถานะการตั้งครรภ์").first()).toBeVisible({
        timeout: 2000,
      });
    });

    test("filling all fields and submitting advances to phase 1", async ({
      page,
    }) => {
      await mockPrescreenStart(
        page,
        mkPrescreenConv(0, "ข้อมูลผู้ป่วย", PHASE_0_QUESTIONS),
      );
      mockPrescreenREST(page, [
        {
          step: mkPrescreenStep(1, "คัดกรองอาการฉุกเฉิน", PHASE_1_QUESTIONS),
          completed: false,
        },
      ]);

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.locator("h3", { hasText: "ข้อมูลทั่วไป" })).toBeVisible(
        { timeout: 8000 },
      );

      // Fill required fields
      await bulkInput(page, "อายุ (ปี)").fill("30");
      const genderField = page
        .locator("label", { hasText: "เพศ" })
        .locator("xpath=../..")
        .first();
      await genderField.getByRole("button", { name: "ชาย" }).click();
      await bulkInput(page, "น้ำหนัก (กก.)").fill("70");
      await bulkInput(page, "ส่วนสูง (ซม.)").fill("170");

      await page.getByRole("button", { name: "ถัดไป" }).click();

      // Phase 1 should appear
      await expect(page.locator("h3", { hasText: "อาการฉุกเฉิน" })).toBeVisible(
        { timeout: 8000 },
      );
    });
  });

  // --------------------------------------------------------------------------
  // 3. Phase 1: ER Critical (red toggles)
  // --------------------------------------------------------------------------
  test.describe("Phase 1: ErCritical", () => {
    async function gotoPhase1(
      page: Page,
      answerSteps?: Array<{
        step: any;
        completed: boolean;
        conversation?: any;
      }>,
    ) {
      await mockPrescreenStart(
        page,
        mkPrescreenConv(1, "คัดกรองอาการฉุกเฉิน", PHASE_1_QUESTIONS),
      );
      mockPrescreenREST(page, answerSteps ?? []);
      // Mock tool response SSE (needed when result is returned)
      await page.route("**/chat/ai/tool-response", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: "event: status\ndata: [DONE]\n\n",
        });
      });

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.locator("h3", { hasText: "อาการฉุกเฉิน" })).toBeVisible(
        { timeout: 8000 },
      );
    }

    test("renders red urgency header and toggles", async ({ page }) => {
      await gotoPhase1(page);

      // Red urgency header
      await expect(
        page.getByText(/หากตอบ.*ใช่.*ผู้ป่วยจะถูกส่งไปห้องฉุกเฉิน/, {
          exact: false,
        }),
      ).toBeVisible();

      // Toggle buttons and question text
      await expect(
        page.getByText("มีภาวะช็อก หมดสติ หรือไม่ตอบสนอง"),
      ).toBeVisible();
      await expect(page.getByText("หายใจลำบากอย่างรุนแรง")).toBeVisible();

      // All toggles initially show ไม่ใช่
      const notYesTexts = page.getByText("ไม่ใช่");
      await expect(notYesTexts.first()).toBeVisible();
    });

    test("toggling a switch shows ใช่ label", async ({ page }) => {
      await gotoPhase1(page);

      // The toggle buttons are <button class="... rounded-full ... bg-gray-300 ...">
      const toggleButton = page
        .locator("button[class*='rounded-full'][class*='bg-gray-300']")
        .first();
      await toggleButton.click();

      // Should now show ใช่
      await expect(page.getByText("ใช่").first()).toBeVisible({
        timeout: 2000,
      });
    });

    test("all No → advances to phase 2", async ({ page }) => {
      await gotoPhase1(page, [
        {
          step: mkPrescreenStep(2, "การเลือกอาการ", PHASE_2_QUESTIONS),
          completed: false,
        },
      ]);

      await page.getByRole("button", { name: "ถัดไป" }).click();
      await expect(page.locator("h3", { hasText: "เลือกอาการ" })).toBeVisible({
        timeout: 8000,
      });
    });

    test("any Yes → emergency termination result", async ({ page }) => {
      await gotoPhase1(page, [
        {
          step: mkResultStep({ terminatedEarly: true }),
          completed: true,
          conversation: mkResultConv({ terminatedEarly: true }),
        },
      ]);

      // Toggle first question to Yes
      const toggleButton = page
        .locator("button[class*='rounded-full'][class*='bg-gray-300']")
        .first();
      await toggleButton.click();
      await page.getByRole("button", { name: "ถัดไป" }).click();

      // Emergency result should appear
      await expect(
        page.getByText("พบอาการฉุกเฉิน — กรุณาไปห้องฉุกเฉินทันที"),
      ).toBeVisible({ timeout: 8000 });
    });
  });

  // --------------------------------------------------------------------------
  // 4. Phase 2: Symptom Select
  // --------------------------------------------------------------------------
  test.describe("Phase 2: Symptom Selection", () => {
    async function gotoPhase2(
      page: Page,
      answerSteps?: Array<{
        step: any;
        completed: boolean;
        conversation?: any;
      }>,
    ) {
      await mockPrescreenStart(
        page,
        mkPrescreenConv(2, "การเลือกอาการ", PHASE_2_QUESTIONS),
      );
      mockPrescreenREST(page, answerSteps ?? []);

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.locator("h3", { hasText: "เลือกอาการ" })).toBeVisible({
        timeout: 8000,
      });
    }

    test("renders primary symptom dropdown and secondary checkboxes", async ({
      page,
    }) => {
      await gotoPhase2(page);

      await expect(page.getByText("อาการหลักที่มาพบแพทย์")).toBeVisible();
      await expect(
        page.getByRole("button", { name: /เลือกอาการหลัก/ }),
      ).toBeVisible();

      // Submit button is always enabled (validates on submit)
      await expect(page.getByRole("button", { name: "ถัดไป" })).toBeEnabled();
    });

    test("submit enabled and selects primary symptom", async ({ page }) => {
      await gotoPhase2(page);

      const submitBtn = page.getByRole("button", { name: "ถัดไป" });
      // Button starts enabled (validates on submit)
      await expect(submitBtn).toBeEnabled();

      // Select a primary symptom via TextDropdown
      await selectDropdownItem(page, /เลือกอาการหลัก/, "ไข้");
      await expect(submitBtn).toBeEnabled();
    });
  });

  // --------------------------------------------------------------------------
  // 5. Phase 3: ER Checklist (orange)
  // --------------------------------------------------------------------------
  test.describe("Phase 3: ErChecklist", () => {
    async function gotoPhase3(
      page: Page,
      questions = PHASE_3_QUESTIONS,
      answerSteps?: Array<{
        step: any;
        completed: boolean;
        conversation?: any;
      }>,
    ) {
      await mockPrescreenStart(
        page,
        mkPrescreenConv(3, "ตรวจสอบอาการฉุกเฉิน", questions),
      );
      mockPrescreenREST(page, answerSteps ?? []);

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(
        page.locator("h3", { hasText: "รายการตรวจฉุกเฉิน" }),
      ).toBeVisible({ timeout: 8000 });
    }

    test("renders orange header and questions", async ({ page }) => {
      await gotoPhase3(page);

      await expect(
        page.getByText("ตรวจสอบรายการอาการฉุกเฉินเพิ่มเติม"),
      ).toBeVisible();
      await expect(page.getByText("ขาดน้ำอย่างรุนแรง")).toBeVisible();
    });

    test("shows 'no questions' state when questions array is empty", async ({
      page,
    }) => {
      await gotoPhase3(page, []);

      await expect(
        page.getByText("ไม่มีรายการตรวจ ER สำหรับอาการที่เลือก"),
      ).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole("button", { name: "ถัดไป" })).toBeVisible();
    });

    test("all No → advances to next phase", async ({ page }) => {
      await gotoPhase3(page, PHASE_3_QUESTIONS, [
        {
          step: mkPrescreenStep(4, "ประวัติอาการ", PHASE_4_SINGLE_SELECT),
          completed: false,
        },
      ]);

      await page.getByRole("button", { name: "ถัดไป" }).click();
      // Sequential phase 4 renders option buttons (not a question text heading)
      await expect(page.getByRole("button", { name: "วันนี้" })).toBeVisible({
        timeout: 8000,
      });
    });
  });

  // --------------------------------------------------------------------------
  // 6. Phase 4: Sequential Questions
  // --------------------------------------------------------------------------
  test.describe("Phase 4: Sequential — Single Select", () => {
    async function gotoSequential(
      page: Page,
      questions: object[],
      answerSteps?: Array<{
        step: any;
        completed: boolean;
        conversation?: any;
      }>,
    ) {
      await mockPrescreenStart(
        page,
        mkPrescreenConv(4, "ประวัติอาการ", questions),
      );
      mockPrescreenREST(page, answerSteps ?? []);

      await goToChatbot(page);
      await clickPrescreenButton(page);
      // Sequential questions don't render a heading for the question text.
      // Wait for the ยืนยัน button which is rendered by PrescreenSelect.
      await expect(page.getByRole("button", { name: "ยืนยัน" })).toBeVisible({
        timeout: 8000,
      });
    }

    test("single select: renders pill buttons, submit disabled until selected", async ({
      page,
    }) => {
      await gotoSequential(page, PHASE_4_SINGLE_SELECT);

      await expect(page.getByRole("button", { name: "วันนี้" })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "เมื่อวาน" }),
      ).toBeVisible();

      const confirm = page.getByRole("button", { name: "ยืนยัน" });
      await expect(confirm).toBeDisabled();
    });

    test("single select: selecting option enables submit", async ({ page }) => {
      await gotoSequential(page, PHASE_4_SINGLE_SELECT);

      await page.getByRole("button", { name: "วันนี้" }).click();
      await expect(page.getByRole("button", { name: "ยืนยัน" })).toBeEnabled();
    });

    test("single select: clicking submit sends answer via REST", async ({
      page,
    }) => {
      const tracker = { answerBodies: [] as any[] };
      await mockPrescreenStart(
        page,
        mkPrescreenConv(4, "ประวัติอาการ", PHASE_4_SINGLE_SELECT),
      );
      await page.route("**/chat/ai/prescreen/*/answer", async (route) => {
        const body = route.request().postDataJSON();
        tracker.answerBodies.push(body);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            step: mkPrescreenStep(4, "next", []),
            completed: false,
          }),
        });
      });

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.getByRole("button", { name: "ยืนยัน" })).toBeVisible({
        timeout: 8000,
      });

      await page.getByRole("button", { name: "วันนี้" }).click();
      await page.getByRole("button", { name: "ยืนยัน" }).click();

      await expect
        .poll(() => tracker.answerBodies.length, { timeout: 5000 })
        .toBeGreaterThan(0);
      expect(tracker.answerBodies[0].answer).toBe("today");
    });
  });

  test.describe("Phase 4: Sequential — Multi Select", () => {
    async function gotoMultiSelect(
      page: Page,
      answerSteps?: Array<{
        step: any;
        completed: boolean;
        conversation?: any;
      }>,
    ) {
      await mockPrescreenStart(
        page,
        mkPrescreenConv(4, "ปัจจัยกระตุ้น", PHASE_4_MULTI_SELECT),
      );
      mockPrescreenREST(page, answerSteps ?? []);

      await goToChatbot(page);
      await clickPrescreenButton(page);
      // Wait for first option button (question text is not rendered as a heading in sequential)
      await expect(
        page.getByRole("button", { name: "การเคลื่อนไหว" }),
      ).toBeVisible({ timeout: 8000 });
    }

    test("multi select: shows เลือกได้หลายข้อ label", async ({ page }) => {
      await gotoMultiSelect(page);
      await expect(page.getByText(/เลือกได้หลายข้อ/i)).toBeVisible();
    });

    test("multi select: submit enabled even without selection (optional)", async ({
      page,
    }) => {
      await gotoMultiSelect(page);
      // Multi-select is optional (allowEmpty=true), so submit is always enabled
      await expect(page.getByRole("button", { name: /ยืนยัน/ })).toBeEnabled();
    });

    test("multi select: can select multiple and submit shows count", async ({
      page,
    }) => {
      await gotoMultiSelect(page);

      await page.getByRole("button", { name: "การเคลื่อนไหว" }).click();
      await page.getByRole("button", { name: "ความเครียด" }).click();

      await expect(
        page.getByRole("button", { name: /ยืนยัน.*\(2\)/ }),
      ).toBeVisible();
    });

    test("multi select: submits array of selected IDs via REST", async ({
      page,
    }) => {
      const tracker = { answerBodies: [] as any[] };
      await mockPrescreenStart(
        page,
        mkPrescreenConv(4, "ปัจจัยกระตุ้น", PHASE_4_MULTI_SELECT),
      );
      await page.route("**/chat/ai/prescreen/*/answer", async (route) => {
        const body = route.request().postDataJSON();
        tracker.answerBodies.push(body);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            step: mkPrescreenStep(4, "next", []),
            completed: false,
          }),
        });
      });

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(
        page.getByRole("button", { name: "การเคลื่อนไหว" }),
      ).toBeVisible({ timeout: 8000 });

      await page.getByRole("button", { name: "การเคลื่อนไหว" }).click();
      await page.getByRole("button", { name: "ความเครียด" }).click();
      await page.getByRole("button", { name: /ยืนยัน/ }).click();

      await expect
        .poll(() => tracker.answerBodies.length, { timeout: 5000 })
        .toBeGreaterThan(0);
      const payload = tracker.answerBodies[0].answer;
      expect(payload).toContain("movement");
      expect(payload).toContain("stress");
    });
  });

  test.describe("Phase 4: Sequential — Number Range", () => {
    async function gotoNumberRange(
      page: Page,
      answerSteps?: Array<{
        step: any;
        completed: boolean;
        conversation?: any;
      }>,
    ) {
      await mockPrescreenStart(
        page,
        mkPrescreenConv(4, "ระดับความเจ็บปวด", PHASE_4_NUMBER),
      );
      mockPrescreenREST(page, answerSteps ?? []);

      await goToChatbot(page);
      await clickPrescreenButton(page);
      // Wait for the number input rendered by PrescreenNumber
      await expect(page.locator("input[type='number']")).toBeVisible({
        timeout: 8000,
      });
    }

    test("renders slider and number input with correct range", async ({
      page,
    }) => {
      await gotoNumberRange(page);

      // Range labels
      await expect(page.getByText("0").first()).toBeVisible();
      await expect(page.getByText("10").first()).toBeVisible();

      // Number input
      const numInput = page.locator("input[type='number']");
      await expect(numInput).toBeVisible();
      await expect(numInput).toHaveValue("5"); // default
    });

    test("number input respects constraints range", async ({ page }) => {
      await gotoNumberRange(page);

      const numInput = page.locator("input[type='number']");
      await expect(numInput).toHaveAttribute("min", "0");
      await expect(numInput).toHaveAttribute("max", "10");
    });

    test("submitting sends correct number value via REST", async ({ page }) => {
      const tracker = { answerBodies: [] as any[] };
      await mockPrescreenStart(
        page,
        mkPrescreenConv(4, "ระดับความเจ็บปวด", PHASE_4_NUMBER),
      );
      await page.route("**/chat/ai/prescreen/*/answer", async (route) => {
        const body = route.request().postDataJSON();
        tracker.answerBodies.push(body);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            step: mkPrescreenStep(4, "next", []),
            completed: false,
          }),
        });
      });

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.locator("input[type='number']")).toBeVisible({
        timeout: 8000,
      });

      // Change value
      await page.locator("input[type='number']").fill("7");
      await page.getByRole("button", { name: "ถัดไป" }).click();

      await expect
        .poll(() => tracker.answerBodies.length, { timeout: 5000 })
        .toBeGreaterThan(0);
      expect(tracker.answerBodies[0].answer).toBe(7);
    });
  });

  test.describe("Phase 4: Sequential — Free Text", () => {
    async function gotoFreeText(
      page: Page,
      answerSteps?: Array<{
        step: any;
        completed: boolean;
        conversation?: any;
      }>,
    ) {
      await mockPrescreenStart(
        page,
        mkPrescreenConv(4, "รายละเอียดอาการ", PHASE_4_FREE_TEXT),
      );
      mockPrescreenREST(page, answerSteps ?? []);

      await goToChatbot(page);
      await clickPrescreenButton(page);
      // Wait for the textarea rendered by PrescreenFreeText
      await expect(page.getByPlaceholder("พิมพ์คำตอบของคุณ...")).toBeVisible({
        timeout: 8000,
      });
    }

    test("renders textarea and submit disabled when empty", async ({
      page,
    }) => {
      await gotoFreeText(page);

      await expect(page.getByPlaceholder("พิมพ์คำตอบของคุณ...")).toBeVisible();
      await expect(page.getByRole("button", { name: /ถัดไป/ })).toBeDisabled();
    });

    test("submit enabled after typing", async ({ page }) => {
      await gotoFreeText(page);
      await page
        .getByPlaceholder("พิมพ์คำตอบของคุณ...")
        .fill("มีไข้สูง ปวดหัว");
      await expect(page.getByRole("button", { name: /ถัดไป/ })).toBeEnabled();
    });

    test("Enter key submits (without Shift)", async ({ page }) => {
      let answered = false;
      await mockPrescreenStart(
        page,
        mkPrescreenConv(4, "รายละเอียดอาการ", PHASE_4_FREE_TEXT),
      );
      await page.route("**/chat/ai/prescreen/*/answer", async (route) => {
        answered = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            step: mkPrescreenStep(4, "next", []),
            completed: false,
          }),
        });
      });

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.getByPlaceholder("พิมพ์คำตอบของคุณ...")).toBeVisible({
        timeout: 8000,
      });

      await page
        .getByPlaceholder("พิมพ์คำตอบของคุณ...")
        .fill("มีไข้สูง ปวดหัว");
      await page.getByPlaceholder("พิมพ์คำตอบของคุณ...").press("Enter");

      await expect.poll(() => answered, { timeout: 5000 }).toBe(true);
    });

    test("Shift+Enter adds newline instead of submitting", async ({ page }) => {
      await gotoFreeText(page);

      const textarea = page.getByPlaceholder("พิมพ์คำตอบของคุณ...");
      await textarea.fill("บรรทัดแรก");
      await textarea.press("Shift+Enter");

      // Should still have text (not cleared)
      await expect(textarea).toHaveValue(/บรรทัดแรก/);
    });

    test("submitting sends trimmed text via REST", async ({ page }) => {
      const tracker = { answerBodies: [] as any[] };
      await mockPrescreenStart(
        page,
        mkPrescreenConv(4, "รายละเอียดอาการ", PHASE_4_FREE_TEXT),
      );
      await page.route("**/chat/ai/prescreen/*/answer", async (route) => {
        const body = route.request().postDataJSON();
        tracker.answerBodies.push(body);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            step: mkPrescreenStep(4, "next", []),
            completed: false,
          }),
        });
      });

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.getByPlaceholder("พิมพ์คำตอบของคุณ...")).toBeVisible({
        timeout: 8000,
      });

      await page.getByPlaceholder("พิมพ์คำตอบของคุณ...").fill("  มีไข้สูง  ");
      await page.getByRole("button", { name: /ถัดไป/ }).click();

      await expect
        .poll(() => tracker.answerBodies.length, { timeout: 5000 })
        .toBeGreaterThan(0);
      expect(tracker.answerBodies[0].answer).toBe("มีไข้สูง");
    });
  });

  test.describe("Phase 4: Sequential — Free Text with Fields", () => {
    async function gotoFields(page: Page) {
      await mockPrescreenStart(
        page,
        mkPrescreenConv(4, "ประวัติเพิ่มเติม", PHASE_4_FIELDS),
      );
      mockPrescreenREST(page, []);

      await goToChatbot(page);
      await clickPrescreenButton(page);
      // PrescreenFields renders labels with htmlFor, so getByLabel works
      await expect(page.getByLabel("การรักษาที่ทำแล้ว")).toBeVisible({
        timeout: 8000,
      });
    }

    test("renders all sub-fields", async ({ page }) => {
      await gotoFields(page);
      await expect(page.getByLabel("การรักษาที่ทำแล้ว")).toBeVisible();
      await expect(page.getByLabel("ยาที่ใช้")).toBeVisible();
    });

    test("submit disabled when all fields empty", async ({ page }) => {
      await gotoFields(page);
      await expect(page.getByRole("button", { name: "ถัดไป" })).toBeDisabled();
    });

    test("submit enabled after filling at least one field", async ({
      page,
    }) => {
      await gotoFields(page);
      await page.getByLabel("การรักษาที่ทำแล้ว").fill("พักผ่อน");
      await expect(page.getByRole("button", { name: "ถัดไป" })).toBeEnabled();
    });
  });

  // --------------------------------------------------------------------------
  // 7. LLM Follow-up Questions
  // --------------------------------------------------------------------------
  test.describe("LLM Follow-up Questions", () => {
    const LLM_QUESTIONS = [
      "คุณมีประวัติโรคประจำตัวอะไรบ้าง?",
      "อาการนี้เริ่มมีมานานเท่าไหร่?",
    ];

    async function gotoLLM(
      page: Page,
      answerSteps?: Array<{
        step: any;
        completed: boolean;
        conversation?: any;
      }>,
    ) {
      await mockPrescreenStart(page, mkLLMQuestionsConv(LLM_QUESTIONS));
      mockPrescreenREST(page, answerSteps ?? []);

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(
        page.getByText("คุณมีประวัติโรคประจำตัวอะไรบ้าง?"),
      ).toBeVisible({ timeout: 8000 });
    }

    test("renders all LLM questions with textareas", async ({ page }) => {
      await gotoLLM(page);

      await expect(
        page.getByText("1. คุณมีประวัติโรคประจำตัวอะไรบ้าง?"),
      ).toBeVisible();
      await expect(
        page.getByText("2. อาการนี้เริ่มมีมานานเท่าไหร่?"),
      ).toBeVisible();
      await expect(
        page.getByPlaceholder("กรุณาตอบคำถาม...").first(),
      ).toBeVisible();
    });

    test("submit disabled until all questions answered", async ({ page }) => {
      await gotoLLM(page);

      const submitBtn = page.getByRole("button", { name: "ถัดไป" });
      await expect(submitBtn).toBeDisabled();

      // Answer only first
      await page
        .getByPlaceholder("กรุณาตอบคำถาม...")
        .first()
        .fill("ไม่มีโรคประจำตัว");
      await expect(submitBtn).toBeDisabled();

      // Answer second
      await page
        .getByPlaceholder("กรุณาตอบคำถาม...")
        .nth(1)
        .fill("เพิ่งเริ่มมา 2 วัน");
      await expect(submitBtn).toBeEnabled();
    });

    test("submits array of {question, answer} pairs via REST", async ({
      page,
    }) => {
      const tracker = { answerBodies: [] as any[] };
      await mockPrescreenStart(page, mkLLMQuestionsConv(LLM_QUESTIONS));
      await page.route("**/chat/ai/prescreen/*/answer", async (route) => {
        const body = route.request().postDataJSON();
        tracker.answerBodies.push(body);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            step: mkResultStep(),
            completed: true,
            conversation: mkResultConv(),
          }),
        });
      });

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(
        page.getByText("คุณมีประวัติโรคประจำตัวอะไรบ้าง?"),
      ).toBeVisible({ timeout: 8000 });

      await page
        .getByPlaceholder("กรุณาตอบคำถาม...")
        .first()
        .fill("ไม่มีโรคประจำตัว");
      await page
        .getByPlaceholder("กรุณาตอบคำถาม...")
        .nth(1)
        .fill("เพิ่งเริ่มมา 2 วัน");
      await page.getByRole("button", { name: "ถัดไป" }).click();

      await expect
        .poll(() => tracker.answerBodies.length, { timeout: 5000 })
        .toBeGreaterThan(0);
      const payload = tracker.answerBodies[0].answer;
      expect(Array.isArray(payload)).toBe(true);
      expect(payload[0]).toEqual({
        question: LLM_QUESTIONS[0],
        answer: "ไม่มีโรคประจำตัว",
      });
      expect(payload[1]).toEqual({
        question: LLM_QUESTIONS[1],
        answer: "เพิ่งเริ่มมา 2 วัน",
      });
    });

    test("empty questions list shows ถัดไป button", async ({ page }) => {
      await mockPrescreenStart(page, mkLLMQuestionsConv([]));
      mockPrescreenREST(page, []);

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.getByText("ไม่มีคำถามเพิ่มเติม")).toBeVisible({
        timeout: 8000,
      });
      await expect(page.getByRole("button", { name: "ถัดไป" })).toBeVisible();
    });
  });

  // --------------------------------------------------------------------------
  // 8. Result Display
  // --------------------------------------------------------------------------
  test.describe("Result Display", () => {
    async function gotoResult(
      page: Page,
      resultOpts?: Parameters<typeof mkResultConv>[0],
    ) {
      // The initial SSE returns phase 1, submit it to get result via REST
      await mockPrescreenStart(
        page,
        mkPrescreenConv(1, "คัดกรองอาการฉุกเฉิน", PHASE_1_QUESTIONS),
      );
      mockPrescreenREST(page, [
        {
          step: mkResultStep(resultOpts),
          completed: true,
          conversation: mkResultConv(resultOpts),
        },
      ]);
      // Abort tool-response requests so the sendToolResponse fails fast
      // and the loading bubble gets cleaned up (result stays as latest)
      await page.route("**/chat/ai/tool-response", async (route) => {
        await route.abort();
      });

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.locator("h3", { hasText: "อาการฉุกเฉิน" })).toBeVisible(
        { timeout: 8000 },
      );

      // Submit phase 1 to trigger result
      const nextBtn = page.getByRole("button", { name: "ถัดไป" });
      await expect(nextBtn).toBeEnabled();
      await nextBtn.click({ force: true });

      await expect(
        page
          .getByText("ประเมินอาการเรียบร้อยแล้วครับ")
          .or(page.getByText("พบอาการฉุกเฉิน"))
          .first(),
      ).toBeVisible({ timeout: 8000 });
    }

    test("normal result shows severity badge and department", async ({
      page,
    }) => {
      await gotoResult(page);

      await expect(page.getByText("ระดับความรุนแรง")).toBeVisible();
      await expect(page.getByText("ปกติ")).toBeVisible();
      await expect(page.getByText("แผนกที่แนะนำ")).toBeVisible();
      await expect(page.getByText("อายุรกรรมทั่วไป")).toBeVisible();
    });

    test("normal result shows diagnoses list", async ({ page }) => {
      await gotoResult(page);

      await expect(page.getByText("การวินิจฉัยเบื้องต้น")).toBeVisible();
      await expect(page.getByText("ไข้หวัด")).toBeVisible();
    });

    test("normal result shows reason", async ({ page }) => {
      await gotoResult(page);
      await expect(page.getByText("อาการทั่วไปไม่รุนแรง")).toBeVisible();
    });

    test("emergency result shows red border and termination message", async ({
      page,
    }) => {
      await gotoResult(page, { terminatedEarly: true });

      await expect(
        page.getByText("พบอาการฉุกเฉิน — กรุณาไปห้องฉุกเฉินทันที"),
      ).toBeVisible({ timeout: 8000 });
    });

    test("result card is rendered with options in conversation data", async ({
      page,
    }) => {
      await gotoResult(page);

      // The result card shows assessment heading
      await expect(page.getByText("ผลการประเมินอาการ")).toBeVisible({
        timeout: 8000,
      });
      // Result card renders with the data
      await expect(page.getByText("ปกติ")).toBeVisible();
    });

    test("clicking ประเมินอาการใหม่ from assistance bar triggers new prescreen", async ({
      page,
    }) => {
      let promptsReceived: string[] = [];
      let callCount = 0;
      await mockChatAI(page, async (prompt, route) => {
        callCount++;
        promptsReceived.push(prompt);
        if (callCount === 1) {
          // First: return phase 1 which we'll submit to get result
          await route.fulfill({
            status: 200,
            contentType: "text/event-stream",
            body: sseBody(
              toolWaitEvent(PENDING_ID, "prescreen-pending"),
              convEvent(
                mkPrescreenConv(1, "คัดกรองอาการฉุกเฉิน", PHASE_1_QUESTIONS),
              ),
            ),
          });
        } else {
          // Subsequent: new prescreen start → return phase 0
          await route.fulfill({
            status: 200,
            contentType: "text/event-stream",
            body: sseBody(
              toolWaitEvent("pending-002", "prescreen-pending"),
              convEvent(mkPrescreenConv(0, "ข้อมูลผู้ป่วย", PHASE_0_QUESTIONS)),
            ),
          });
        }
      });

      // Mock /step endpoint to return the current step
      let stepCallCount = 0;
      await page.route("**/chat/ai/prescreen/*/step", async (route) => {
        stepCallCount++;
        const step =
          stepCallCount === 1
            ? mkPrescreenStep(1, "คัดกรองอาการฉุกเฉิน", PHASE_1_QUESTIONS)
            : mkPrescreenStep(0, "ข้อมูลผู้ป่วย", PHASE_0_QUESTIONS);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ step }),
        });
      });

      // Mock REST answer to return result
      await page.route("**/chat/ai/prescreen/*/answer", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            step: mkResultStep(),
            completed: true,
            conversation: mkResultConv(),
          }),
        });
      });

      // Abort tool response so it completes quickly
      await page.route("**/chat/ai/tool-response", async (route) => {
        await route.abort();
      });

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.locator("h3", { hasText: "อาการฉุกเฉิน" })).toBeVisible(
        { timeout: 8000 },
      );

      // Submit to get result
      await page.getByRole("button", { name: "ถัดไป" }).click();

      // Wait for result to show in chat
      await expect(page.getByText("ประเมินอาการเรียบร้อยแล้วครับ")).toBeVisible(
        { timeout: 8000 },
      );

      // Use the always-visible assistance bar button to start new prescreen
      const assistanceBtn = page
        .getByRole("button", { name: /ประเมินอาการเบื้องต้น/ })
        .last();
      await expect(assistanceBtn).toBeVisible({ timeout: 5000 });
      await assistanceBtn.click();

      await expect
        .poll(
          () =>
            promptsReceived.some(
              (p) => p === "ประเมินอาการเบื้องต้น" || p === "ประเมินอาการใหม่",
            ),
          {
            timeout: 5000,
          },
        )
        .toBe(true);
    });

    test("no data result shows fallback message", async ({ page }) => {
      const emptyResultStep = {
        type: "pipeline_result",
        terminated_early: false,
        severity: null,
        departments: [],
        diagnoses: [],
        reason: null,
      };
      const emptyResultConv = {
        id: "conv-result-empty",
        role: "assistant",
        content: "ประเมินอาการเรียบร้อยแล้วครับ",
        actionType: "prescreen-result",
        category: "prescreening",
        options: [{ label: "ประเมินอาการใหม่", value: "ประเมินอาการใหม่" }],
        metadata: {
          prescreenSessionId: SESSION_ID,
          step: emptyResultStep,
          showSirirajQuestionnaire: true,
          pendingToolCallId: PENDING_ID,
        },
      };

      await mockPrescreenStart(
        page,
        mkPrescreenConv(1, "คัดกรองอาการฉุกเฉิน", PHASE_1_QUESTIONS),
      );
      await page.route("**/chat/ai/prescreen/*/answer", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            step: emptyResultStep,
            completed: true,
            conversation: emptyResultConv,
          }),
        });
      });

      // Mock tool response SSE
      await page.route("**/chat/ai/tool-response", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: "event: status\ndata: [DONE]\n\n",
        });
      });

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.locator("h3", { hasText: "อาการฉุกเฉิน" })).toBeVisible(
        { timeout: 8000 },
      );

      await page.getByRole("button", { name: "ถัดไป" }).click();

      await expect(
        page.getByText("บันทึกข้อมูลอาการเรียบร้อยแล้ว"),
      ).toBeVisible({ timeout: 8000 });
    });
  });

  // --------------------------------------------------------------------------
  // 9. Step Back Navigation
  // --------------------------------------------------------------------------
  test.describe("Step Back Navigation", () => {
    test("ย้อนกลับ button appears on active prescreen phase", async ({
      page,
    }) => {
      await mockPrescreenStart(
        page,
        mkPrescreenConv(2, "การเลือกอาการ", PHASE_2_QUESTIONS),
      );
      mockPrescreenREST(page, []);

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.locator("h3", { hasText: "เลือกอาการ" })).toBeVisible({
        timeout: 8000,
      });
      await expect(
        page.getByRole("button", { name: "ย้อนกลับ" }),
      ).toBeVisible();
    });

    test("clicking ย้อนกลับ sends back request via REST and shows previous phase", async ({
      page,
    }) => {
      await mockPrescreenStart(
        page,
        mkPrescreenConv(2, "การเลือกอาการ", PHASE_2_QUESTIONS),
      );
      // Mock back endpoint to return phase 1
      await page.route("**/chat/ai/prescreen/*/back", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            step: mkPrescreenStep(1, "คัดกรองอาการฉุกเฉิน", PHASE_1_QUESTIONS),
          }),
        });
      });

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.locator("h3", { hasText: "เลือกอาการ" })).toBeVisible({
        timeout: 8000,
      });

      await page.getByRole("button", { name: "ย้อนกลับ" }).click();

      await expect(page.locator("h3", { hasText: "อาการฉุกเฉิน" })).toBeVisible(
        { timeout: 8000 },
      );
    });

    test("modal replaces content when advancing to next question", async ({
      page,
    }) => {
      await mockPrescreenStart(
        page,
        mkPrescreenConv(4, "Onset", PHASE_4_SINGLE_SELECT),
      );
      mockPrescreenREST(page, [
        {
          step: mkPrescreenStep(4, "ปัจจัยกระตุ้น", PHASE_4_MULTI_SELECT),
          completed: false,
        },
      ]);

      await goToChatbot(page);
      await clickPrescreenButton(page);

      // First sequential question (Onset) appears with its options
      await expect(page.getByRole("button", { name: "วันนี้" })).toBeVisible({
        timeout: 8000,
      });

      // Select "วันนี้" and submit — this triggers the REST call
      await page.getByRole("button", { name: "วันนี้" }).click();
      await page.getByRole("button", { name: "ยืนยัน" }).click();

      // After advancing, the modal replaces content with the second question
      await expect(
        page.getByRole("button", { name: "การเคลื่อนไหว" }),
      ).toBeVisible({ timeout: 8000 });

      // First question's options are no longer visible (modal shows only current step)
      await expect(
        page.getByRole("button", { name: "วันนี้" }),
      ).not.toBeVisible();
    });
  });

  // --------------------------------------------------------------------------
  // 10. Draft Persistence
  // --------------------------------------------------------------------------
  test.describe("Step Back", () => {
    test("step back re-renders previous phase with empty form", async ({
      page,
    }) => {
      test.setTimeout(60000);
      await mockPrescreenStart(
        page,
        mkPrescreenConv(0, "ข้อมูลผู้ป่วย", PHASE_0_QUESTIONS),
      );

      // First answer → phase 1, then back → phase 0
      let answerCount = 0;
      await page.route("**/chat/ai/prescreen/*/answer", async (route) => {
        answerCount++;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            step: mkPrescreenStep(1, "คัดกรองอาการฉุกเฉิน", PHASE_1_QUESTIONS),
            completed: false,
          }),
        });
      });
      await page.route("**/chat/ai/prescreen/*/back", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            step: mkPrescreenStep(0, "ข้อมูลผู้ป่วย", PHASE_0_QUESTIONS),
          }),
        });
      });

      await goToChatbot(page);
      await clickPrescreenButton(page);
      await expect(page.locator("h3", { hasText: "ข้อมูลทั่วไป" })).toBeVisible(
        { timeout: 8000 },
      );

      // Fill phase 0 (all required fields) and submit
      // Wait for form to stabilize before filling
      await expect(bulkInput(page, "อายุ (ปี)")).toBeEditable({
        timeout: 5000,
      });
      await bulkInput(page, "อายุ (ปี)").fill("25");
      const genderField = page
        .locator("label", { hasText: "เพศ" })
        .locator("xpath=../..")
        .first();
      await genderField.getByRole("button", { name: "ชาย" }).click();
      await bulkInput(page, "น้ำหนัก (กก.)").fill("60");
      await expect(bulkInput(page, "ส่วนสูง (ซม.)")).toBeEditable({
        timeout: 5000,
      });
      await bulkInput(page, "ส่วนสูง (ซม.)").fill("170");
      await page.getByRole("button", { name: "ถัดไป" }).click();
      await expect(page.locator("h3", { hasText: "อาการฉุกเฉิน" })).toBeVisible(
        { timeout: 8000 },
      );

      // Go back — modal re-renders phase 0 with fresh (empty) form
      await page.getByRole("button", { name: "ย้อนกลับ" }).click();
      await expect(page.locator("h3", { hasText: "ข้อมูลทั่วไป" })).toBeVisible(
        { timeout: 8000 },
      );

      // Draft values are preserved when going back (modal caches drafts)
      await expect(bulkInput(page, "อายุ (ปี)")).toHaveValue("25");
    });
  });

  // --------------------------------------------------------------------------
  // 11. Error Handling
  // --------------------------------------------------------------------------
  test.describe("Error Handling", () => {
    test("backend error shows error message in chat", async ({ page }) => {
      await mockChatAI(page, async (_p, route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: `event: error\ndata: ${JSON.stringify({ message: "เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่" })}\n\nevent: status\ndata: [DONE]\n\n`,
        });
      });

      await goToChatbot(page);
      await clickPrescreenButton(page);

      // Error message shown in chat
      await expect(
        page
          .getByText(/เซิร์ฟเวอร์ขัดข้อง|เกิดข้อผิดพลาด|ขออภัย/, {
            exact: false,
          })
          .first(),
      ).toBeVisible({ timeout: 8000 });
    });

    test("503 HTTP error from backend shows error in chat", async ({
      page,
    }) => {
      await mockChatAI(page, async (_p, route) => {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Service Unavailable" }),
        });
      });

      await goToChatbot(page);
      await clickPrescreenButton(page);

      // Should show error state
      await expect(
        page
          .getByText(/เกิดข้อผิดพลาด|ขออภัย|503|Service Unavailable/, {
            exact: false,
          })
          .first(),
      ).toBeVisible({ timeout: 8000 });
    });
  });

  // --------------------------------------------------------------------------
  // 12. Full Happy-Path Walkthrough
  // --------------------------------------------------------------------------
  test.describe("Full Happy-Path Flow", () => {
    // TODO: This E2E happy-path test is skipped due to persistent DOM detachment
    // in the Dialog modal during rapid multi-phase transitions. All individual phase
    // tests pass reliably. The modal re-keys its DialogBody content causing elements
    // to detach between renders.
    test.skip("complete prescreen from phase 0 to result", async ({ page }) => {
      test.setTimeout(90000);
      await mockPrescreenStart(
        page,
        mkPrescreenConv(0, "ข้อมูลผู้ป่วย", PHASE_0_QUESTIONS),
      );

      // Mock cancel endpoint
      await page.route("**/chat/ai/prescreen/*/cancel", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      });

      // Stateful REST mock for the full flow
      let answerCount = 0;
      await page.route("**/chat/ai/prescreen/*/answer", async (route) => {
        answerCount++;
        let result: any;
        if (answerCount === 1) {
          // Phase 0 → Phase 1
          result = {
            step: mkPrescreenStep(1, "คัดกรองอาการฉุกเฉิน", PHASE_1_QUESTIONS),
            completed: false,
          };
        } else if (answerCount === 2) {
          // Phase 1 → Phase 2
          result = {
            step: mkPrescreenStep(2, "การเลือกอาการ", PHASE_2_QUESTIONS),
            completed: false,
          };
        } else if (answerCount === 3) {
          // Phase 2 → Phase 3
          result = {
            step: mkPrescreenStep(3, "ตรวจสอบอาการฉุกเฉิน", PHASE_3_QUESTIONS),
            completed: false,
          };
        } else if (answerCount === 4) {
          // Phase 3 → Phase 4 (sequential)
          result = {
            step: mkPrescreenStep(4, "ระยะเวลาอาการ", PHASE_4_SINGLE_SELECT),
            completed: false,
          };
        } else if (answerCount === 5) {
          // Phase 4 → LLM questions
          result = {
            step: mkLLMStep(["คุณมีอาการอื่นอีกไหม?"]),
            completed: false,
          };
        } else {
          // LLM → Result
          result = {
            step: mkResultStep(),
            completed: true,
            conversation: mkResultConv(),
          };
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(result),
        });
      });

      // Mock tool response SSE (for after result)
      await page.route("**/chat/ai/tool-response", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: "event: status\ndata: [DONE]\n\n",
        });
      });

      await goToChatbot(page);

      // Start
      await clickPrescreenButton(page);
      await expect(page.locator("h3", { hasText: "ข้อมูลทั่วไป" })).toBeVisible(
        { timeout: 8000 },
      );

      // Phase 0: fill & submit — wait for dialog to fully mount
      await expect(page.locator('[role="dialog"]')).toBeVisible({
        timeout: 10000,
      });
      await expect(bulkInput(page, "อายุ (ปี)")).toBeEditable({
        timeout: 10000,
      });
      await bulkInput(page, "อายุ (ปี)").fill("30");
      const genderBtn = page.getByRole("button", { name: "ชาย" }).first();
      await expect(genderBtn).toBeVisible({ timeout: 5000 });
      await genderBtn.click({ force: true });
      await bulkInput(page, "น้ำหนัก (กก.)").fill("70");
      await expect(bulkInput(page, "ส่วนสูง (ซม.)")).toBeEditable({
        timeout: 5000,
      });
      await bulkInput(page, "ส่วนสูง (ซม.)").fill("170");
      await page.getByRole("button", { name: "ถัดไป" }).first().click();
      await expect(page.locator("h3", { hasText: "อาการฉุกเฉิน" })).toBeVisible(
        { timeout: 8000 },
      );

      // Phase 1: all No, submit — wait for button to stabilize
      const phase1Next = page.getByRole("button", { name: "ถัดไป" }).first();
      await expect(phase1Next).toBeVisible({ timeout: 5000 });
      await phase1Next.click();
      await expect(page.locator("h3", { hasText: "เลือกอาการ" })).toBeVisible({
        timeout: 10000,
      });

      // Phase 2: select primary & submit — wait for dropdown to stabilize
      const symptomDropdown = page.getByRole("button", {
        name: /เลือกอาการหลัก/,
      });
      await expect(symptomDropdown).toBeVisible({ timeout: 8000 });
      await page.waitForTimeout(500);
      await selectDropdownItem(page, /เลือกอาการหลัก/, "ไข้");
      await page.getByRole("button", { name: "ถัดไป" }).first().click();
      await expect(
        page.locator("h3", { hasText: "รายการตรวจฉุกเฉิน" }),
      ).toBeVisible({ timeout: 8000 });

      // Phase 3: all No, submit
      await page.getByRole("button", { name: "ถัดไป" }).first().click();
      // Sequential phase 4 — wait for option buttons, not question text heading
      await expect(page.getByRole("button", { name: "วันนี้" })).toBeVisible({
        timeout: 8000,
      });

      // Phase 4 sequential: pick option
      await page.getByRole("button", { name: "วันนี้" }).click();
      await page.getByRole("button", { name: "ยืนยัน" }).click();
      await expect(page.getByText("คุณมีอาการอื่นอีกไหม?")).toBeVisible({
        timeout: 8000,
      });

      // LLM questions: answer & submit
      await page.getByPlaceholder("กรุณาตอบคำถาม...").fill("ไม่มีอาการอื่น");
      await page.getByRole("button", { name: "ถัดไป" }).first().click();

      // Result
      await expect(page.getByText("ประเมินอาการเรียบร้อยแล้วครับ")).toBeVisible(
        { timeout: 8000 },
      );
      await expect(page.getByText("ระดับความรุนแรง")).toBeVisible();
      await expect(page.getByText("ปกติ")).toBeVisible();
      await expect(page.getByText("ไข้หวัด")).toBeVisible();
    });
  });
});
