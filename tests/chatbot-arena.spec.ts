import { expect, test } from "@playwright/test";

const SSE_BODY = [
  'event: arena_init\ndata: {"sessionId":"sess-1"}\n\n',
  'event: arena_reveal\ndata: {"modelA":"ModelA","modelB":"ModelB"}\n\n',
  'event: stream_a\ndata: "Answer from model A"\n\n',
  'event: stream_b\ndata: "Answer from model B"\n\n',
  "event: status\ndata: [DONE]\n\n",
].join("");

test.describe("Chatbot Arena Page", () => {
  test.beforeEach(async ({ page }) => {
    // Mock getMe API to return user data
    await page.route("**/auth/me", async (route) => {
      const request = route.request();
      if (request.method() !== "GET") {
        return route.continue();
      }

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

    // Mock arena models API
    await page.route("**/arena/models", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { name: "ModelA" },
          { name: "ModelB" },
          { name: "ModelC" },
        ]),
      });
    });

    // Mock arena ask SSE endpoint
    await page.route("**/arena/ask", async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: SSE_BODY,
      });
    });

    // Mock arena vote endpoint
    await page.route("**/arena/vote", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, voteId: "v1" }),
      });
    });

    // Set authentication cookies
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
  });

  test.describe("Basic UI Tests", () => {
    test("should display chatbot arena page with header", async ({ page }) => {
      await page.goto("./developer/chatbot-arena");

      // Wait for heading
      await expect(
        page.getByRole("heading", { name: /Chatbot Arena/ }),
      ).toBeVisible({ timeout: 5000 });

      // Check subtitle
      await expect(
        page.getByText(/ทดลองเปรียบเทียบคำตอบจาก 2 โมเดลที่แตกต่างกัน/),
      ).toBeVisible();
    });

    test("should display default questions when no question is set", async ({
      page,
    }) => {
      await page.goto("./developer/chatbot-arena");

      // Wait for default questions to appear via the label text
      await expect(page.getByText("ตัวอย่างคำถาม").first()).toBeVisible({
        timeout: 5000,
      });

      // All 8 default questions should be visible
      const defaultQuestions = [
        "ยาควรเก็บที่อุณหภูมิเท่าไรถึงจะปลอดภัย?",
        "ควรเว้นเวลากินยาหลังจากดื่มนมกี่ชั่วโมง?",
        "อัตราการเต้นของหัวใจปกติในผู้ใหญ่ควรอยู่ที่เท่าไหร่?",
        "วิธีล้างแผลที่ถูกต้องตามหลักเวชปฏิบัติคืออะไร?",
        "การใช้หน้ากากอนามัยแบบ N95 แตกต่างจากหน้ากากผ้าหรือไม่?",
        "อาหารประเภทใดที่ควรหลีกเลี่ยงหลังผ่าตัด?",
        "ถ้ากินยาพาราเซตามอลเกินขนาด จะเกิดอะไรขึ้น?",
        "อาการของโรคเบาหวานระยะเริ่มต้นมีอะไรบ้าง?",
      ];

      for (const question of defaultQuestions) {
        await expect(page.getByText(question)).toBeVisible();
      }

      // Check that "ตัวอย่างคำถาม" labels are present (one per card)
      const labels = page.getByText("ตัวอย่างคำถาม");
      await expect(labels).toHaveCount(8);
    });

    test("should display question input field with send button", async ({
      page,
    }) => {
      await page.goto("./developer/chatbot-arena");

      const input = page.getByPlaceholder("พิมพ์ข้อความที่นี่...");
      await expect(input).toBeVisible({ timeout: 5000 });

      const sendButton = page.getByRole("button", { name: "ส่งคำถาม" });
      await expect(sendButton).toBeVisible();
    });

    test("should display model selection dropdowns showing default random label", async ({
      page,
    }) => {
      await page.goto("./developer/chatbot-arena");

      // Two TextDropdowns showing "สุ่มโมเดล" should be visible by default
      const randomLabels = page
        .locator('[data-slot="dropdown-menu-trigger"]')
        .filter({ hasText: "สุ่มโมเดล" });
      await expect(randomLabels.first()).toBeVisible({ timeout: 5000 });
      await expect(randomLabels).toHaveCount(2);

      // The "vs" separator should be visible
      await expect(page.getByText("vs")).toBeVisible();
    });
  });

  test.describe("Default Questions Interaction", () => {
    test("should select a default question when clicked", async ({ page }) => {
      await page.goto("./developer/chatbot-arena");

      // Wait for default questions
      await expect(page.getByText("ตัวอย่างคำถาม").first()).toBeVisible({
        timeout: 5000,
      });

      // Click on first default question
      await page.getByText("ยาควรเก็บที่อุณหภูมิเท่าไรถึงจะปลอดภัย?").click();

      // Question should be displayed in the question bar
      await expect(
        page.getByText("ยาควรเก็บที่อุณหภูมิเท่าไรถึงจะปลอดภัย?"),
      ).toBeVisible({ timeout: 2000 });

      // Default question cards should be hidden
      await expect(page.getByText("ตัวอย่างคำถาม").first()).not.toBeVisible();
    });

    test("should display model answers after selecting a question", async ({
      page,
    }) => {
      await page.goto("./developer/chatbot-arena");

      await expect(page.getByText("ตัวอย่างคำถาม").first()).toBeVisible({
        timeout: 5000,
      });

      // Click on a default question
      await page.getByText("ยาควรเก็บที่อุณหภูมิเท่าไรถึงจะปลอดภัย?").click();

      // Wait for SSE stream answers to appear
      await expect(page.getByText("Answer from model A")).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText("Answer from model B")).toBeVisible();
    });

    test("should display clear question button after selecting a question", async ({
      page,
    }) => {
      await page.goto("./developer/chatbot-arena");

      await expect(page.getByText("ตัวอย่างคำถาม").first()).toBeVisible({
        timeout: 5000,
      });

      await page.getByText("ยาควรเก็บที่อุณหภูมิเท่าไรถึงจะปลอดภัย?").click();

      const clearButton = page.getByRole("button", {
        name: "Clear question input",
      });
      await expect(clearButton).toBeVisible({ timeout: 2000 });
    });

    test("should clear question when clear button is clicked", async ({
      page,
    }) => {
      await page.goto("./developer/chatbot-arena");

      await expect(page.getByText("ตัวอย่างคำถาม").first()).toBeVisible({
        timeout: 5000,
      });

      await page.getByText("ยาควรเก็บที่อุณหภูมิเท่าไรถึงจะปลอดภัย?").click();

      // Wait for answers to load so clear button is enabled
      await expect(page.getByText("Answer from model A")).toBeVisible({
        timeout: 5000,
      });

      const clearButton = page.getByRole("button", {
        name: "Clear question input",
      });
      await clearButton.click();

      // Default questions should be visible again
      await expect(page.getByText("ตัวอย่างคำถาม").first()).toBeVisible({
        timeout: 2000,
      });
    });
  });

  test.describe("Model Answer Cards", () => {
    test("should display two model answer cards with labels A and B", async ({
      page,
    }) => {
      await page.goto("./developer/chatbot-arena");

      await expect(page.getByText("ตัวอย่างคำถาม").first()).toBeVisible({
        timeout: 5000,
      });
      await page.getByText("ยาควรเก็บที่อุณหภูมิเท่าไรถึงจะปลอดภัย?").click();

      // Wait for answer cards to appear
      await expect(page.getByText("Answer from model A")).toBeVisible({
        timeout: 5000,
      });

      // Check for labels "โมเดล A" and "โมเดล B" (shown when model name is hidden)
      await expect(page.getByText("โมเดล A")).toBeVisible();
      await expect(page.getByText("โมเดล B")).toBeVisible();
    });

    test("should display copy button on each model answer card", async ({
      page,
    }) => {
      await page.goto("./developer/chatbot-arena");

      await expect(page.getByText("ตัวอย่างคำถาม").first()).toBeVisible({
        timeout: 5000,
      });
      await page.getByText("ยาควรเก็บที่อุณหภูมิเท่าไรถึงจะปลอดภัย?").click();

      // Wait for answers to load
      await expect(page.getByText("Answer from model A")).toBeVisible({
        timeout: 5000,
      });

      // Check for copy buttons
      const copyButtons = page.getByRole("button", {
        name: "Copy to clipboard",
      });
      await expect(copyButtons).toHaveCount(2);
    });
  });

  test.describe("Vote Functionality", () => {
    test("should display vote section after answers are loaded", async ({
      page,
    }) => {
      await page.goto("./developer/chatbot-arena");

      await expect(page.getByText("ตัวอย่างคำถาม").first()).toBeVisible({
        timeout: 5000,
      });
      await page.getByText("ยาควรเก็บที่อุณหภูมิเท่าไรถึงจะปลอดภัย?").click();

      // Wait for stream to complete and vote section to appear
      await expect(
        page.getByText("คุณชอบผลลัพท์ของโมเดลใดมากกว่ากัน"),
      ).toBeVisible({ timeout: 5000 });
    });

    test("should display all vote options", async ({ page }) => {
      await page.goto("./developer/chatbot-arena");

      await expect(page.getByText("ตัวอย่างคำถาม").first()).toBeVisible({
        timeout: 5000,
      });
      await page.getByText("ยาควรเก็บที่อุณหภูมิเท่าไรถึงจะปลอดภัย?").click();

      // Wait for vote section
      await expect(
        page.getByText("คุณชอบผลลัพท์ของโมเดลใดมากกว่ากัน"),
      ).toBeVisible({ timeout: 5000 });

      await expect(page.getByText("A ดีกว่า")).toBeVisible();
      await expect(page.getByText("B ดีกว่า")).toBeVisible();
      await expect(page.getByText("พอๆ กัน")).toBeVisible();
      await expect(page.getByText("ไม่ดีทั้งคู่")).toBeVisible();
    });

    test("should select a vote option and show colored background", async ({
      page,
    }) => {
      await page.goto("./developer/chatbot-arena");

      await expect(page.getByText("ตัวอย่างคำถาม").first()).toBeVisible({
        timeout: 5000,
      });
      await page.getByText("ยาควรเก็บที่อุณหภูมิเท่าไรถึงจะปลอดภัย?").click();

      // Wait for stream to complete so vote buttons are enabled
      await expect(page.getByText("Answer from model A")).toBeVisible({
        timeout: 5000,
      });
      await expect(
        page.getByText("คุณชอบผลลัพท์ของโมเดลใดมากกว่ากัน"),
      ).toBeVisible();

      // Click on "A ดีกว่า"
      const voteOptionA = page
        .getByRole("button")
        .filter({ hasText: "A ดีกว่า" })
        .first();
      await voteOptionA.click();

      // Should have bg-blue-50 for the A vote
      await expect(voteOptionA).toHaveClass(/bg-blue-50/);
    });

    test("should show thank you text after voting", async ({ page }) => {
      await page.goto("./developer/chatbot-arena");

      await expect(page.getByText("ตัวอย่างคำถาม").first()).toBeVisible({
        timeout: 5000,
      });
      await page.getByText("ยาควรเก็บที่อุณหภูมิเท่าไรถึงจะปลอดภัย?").click();

      // Wait for stream to complete
      await expect(page.getByText("Answer from model A")).toBeVisible({
        timeout: 5000,
      });
      await expect(
        page.getByText("คุณชอบผลลัพท์ของโมเดลใดมากกว่ากัน"),
      ).toBeVisible();

      // Vote
      const voteOption = page
        .getByRole("button")
        .filter({ hasText: "B ดีกว่า" })
        .first();
      await voteOption.click();

      // Thank you message should appear
      await expect(page.getByText("ขอบคุณสำหรับการโหวต!")).toBeVisible({
        timeout: 2000,
      });
    });
  });

  test.describe("Model Dropdowns", () => {
    test("should display model dropdowns showing default random label", async ({
      page,
    }) => {
      await page.goto("./developer/chatbot-arena");

      // Both dropdowns should show "สุ่มโมเดล" by default
      const randomLabels = page
        .locator('[data-slot="dropdown-menu-trigger"]')
        .filter({ hasText: "สุ่มโมเดล" });
      await expect(randomLabels.first()).toBeVisible({ timeout: 5000 });
      await expect(randomLabels).toHaveCount(2);
    });

    test("should allow selecting a model from dropdown A", async ({ page }) => {
      await page.goto("./developer/chatbot-arena");

      // Wait for dropdowns
      const dropdownTriggers = page
        .locator('[data-slot="dropdown-menu-trigger"]')
        .filter({ hasText: "สุ่มโมเดล" });
      await expect(dropdownTriggers.first()).toBeVisible({ timeout: 5000 });

      // Click on the first dropdown (Model A)
      await dropdownTriggers.first().click();

      // Wait for dropdown menu content to be visible
      const menuContent = page.locator('[data-slot="dropdown-menu-content"]');
      await expect(menuContent).toBeVisible({ timeout: 2000 });

      // Select "ModelA" from the dropdown
      await menuContent.getByText("ModelA").click();

      // The dropdown trigger should now show "ModelA"
      await expect(page.getByText("ModelA").first()).toBeVisible();
    });

    test("should allow selecting a model from dropdown B", async ({ page }) => {
      await page.goto("./developer/chatbot-arena");

      const dropdownTriggers = page
        .locator('[data-slot="dropdown-menu-trigger"]')
        .filter({ hasText: "สุ่มโมเดล" });
      await expect(dropdownTriggers.first()).toBeVisible({ timeout: 5000 });

      // Click on the second dropdown (Model B)
      await dropdownTriggers.nth(1).click();

      // Wait for dropdown menu content
      const menuContent = page.locator('[data-slot="dropdown-menu-content"]');
      await expect(menuContent).toBeVisible({ timeout: 2000 });

      // Select "ModelB"
      await menuContent.getByText("ModelB").click();

      // The dropdown should now show "ModelB"
      await expect(page.getByText("ModelB").first()).toBeVisible();
    });

    test("should exclude selected model from other dropdown", async ({
      page,
    }) => {
      await page.goto("./developer/chatbot-arena");

      const dropdownTriggers = page
        .locator('[data-slot="dropdown-menu-trigger"]')
        .filter({ hasText: "สุ่มโมเดล" });
      await expect(dropdownTriggers.first()).toBeVisible({ timeout: 5000 });

      // Select "ModelA" in dropdown A
      await dropdownTriggers.first().click();
      const menuContentA = page.locator('[data-slot="dropdown-menu-content"]');
      await expect(menuContentA).toBeVisible({ timeout: 2000 });
      await menuContentA.getByText("ModelA").click();

      // Now open dropdown B
      // After selecting ModelA for A, dropdown B still shows "สุ่มโมเดล"
      await page
        .locator('[data-slot="dropdown-menu-trigger"]')
        .filter({ hasText: "สุ่มโมเดล" })
        .click();
      const menuContentB = page.locator(
        '[data-slot="dropdown-menu-content"][data-state="open"]',
      );
      await expect(menuContentB).toBeVisible({ timeout: 2000 });

      // "ModelA" should NOT be in dropdown B options
      await expect(menuContentB.getByText("ModelA")).toHaveCount(0);

      // But "ModelB" and "ModelC" should be present
      await expect(menuContentB.getByText("ModelB")).toBeVisible();
      await expect(menuContentB.getByText("ModelC")).toBeVisible();
    });
  });

  test.describe("Question Input and Submission", () => {
    test("should enable send button when input has text", async ({ page }) => {
      await page.goto("./developer/chatbot-arena");

      const input = page.getByPlaceholder("พิมพ์ข้อความที่นี่...");
      await expect(input).toBeVisible({ timeout: 5000 });

      const sendButton = page.getByRole("button", { name: "ส่งคำถาม" });

      // Initially disabled
      await expect(sendButton).toBeDisabled();

      // Type some text
      await input.fill("คำถามทดสอบ");

      // Button should be enabled
      await expect(sendButton).toBeEnabled();
    });

    test("should disable send button when input is cleared", async ({
      page,
    }) => {
      await page.goto("./developer/chatbot-arena");

      const input = page.getByPlaceholder("พิมพ์ข้อความที่นี่...");
      await expect(input).toBeVisible({ timeout: 5000 });

      const sendButton = page.getByRole("button", { name: "ส่งคำถาม" });

      // Type text
      await input.fill("คำถามทดสอบ");
      await expect(sendButton).toBeEnabled();

      // Clear input
      await input.clear();

      // Button should be disabled
      await expect(sendButton).toBeDisabled();
    });

    test("should submit question via send button", async ({ page }) => {
      await page.goto("./developer/chatbot-arena");

      const input = page.getByPlaceholder("พิมพ์ข้อความที่นี่...");
      await expect(input).toBeVisible({ timeout: 5000 });

      const testQuestion = "คำถามทดสอบจากผู้ใช้";
      await input.fill(testQuestion);

      const sendButton = page.getByRole("button", { name: "ส่งคำถาม" });
      await sendButton.click();

      // Question should be displayed in the question bar
      await expect(page.getByText(testQuestion)).toBeVisible({ timeout: 2000 });
    });

    test("should submit question via Enter key", async ({ page }) => {
      await page.goto("./developer/chatbot-arena");

      const input = page.getByPlaceholder("พิมพ์ข้อความที่นี่...");
      await expect(input).toBeVisible({ timeout: 5000 });

      const testQuestion = "คำถามทดสอบจากผู้ใช้";
      await input.fill(testQuestion);

      await input.press("Enter");

      // Question should be displayed
      await expect(page.getByText(testQuestion)).toBeVisible({ timeout: 2000 });
    });

    test("should clear input after submitting question", async ({ page }) => {
      await page.goto("./developer/chatbot-arena");

      const input = page.getByPlaceholder("พิมพ์ข้อความที่นี่...");
      await expect(input).toBeVisible({ timeout: 5000 });

      const testQuestion = "คำถามทดสอบจากผู้ใช้";
      await input.fill(testQuestion);

      const sendButton = page.getByRole("button", { name: "ส่งคำถาม" });
      await sendButton.click();

      // Input should be cleared
      await expect(input).toHaveValue("");
    });

    test("should not submit empty question", async ({ page }) => {
      await page.goto("./developer/chatbot-arena");

      const input = page.getByPlaceholder("พิมพ์ข้อความที่นี่...");
      await expect(input).toBeVisible({ timeout: 5000 });

      const sendButton = page.getByRole("button", { name: "ส่งคำถาม" });

      // Button should be disabled
      await expect(sendButton).toBeDisabled();

      // Try to submit (should not work)
      await sendButton.click({ force: true });

      // Default questions should still be visible
      await expect(page.getByText("ตัวอย่างคำถาม").first()).toBeVisible();
    });
  });

  test.describe("Integration Tests", () => {
    test("should complete full workflow: select question, view answers, and vote", async ({
      page,
    }) => {
      await page.goto("./developer/chatbot-arena");

      // Step 1: Select a default question
      await expect(page.getByText("ตัวอย่างคำถาม").first()).toBeVisible({
        timeout: 5000,
      });
      await page.getByText("ยาควรเก็บที่อุณหภูมิเท่าไรถึงจะปลอดภัย?").click();

      // Step 2: Verify question is displayed
      await expect(
        page.getByText("ยาควรเก็บที่อุณหภูมิเท่าไรถึงจะปลอดภัย?"),
      ).toBeVisible({ timeout: 2000 });

      // Step 3: Verify model answers from SSE stream
      await expect(page.getByText("Answer from model A")).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText("Answer from model B")).toBeVisible();

      // Step 4: Vote on an option
      await expect(
        page.getByText("คุณชอบผลลัพท์ของโมเดลใดมากกว่ากัน"),
      ).toBeVisible();

      const voteOption = page
        .getByRole("button")
        .filter({ hasText: "พอๆ กัน" })
        .first();
      await voteOption.click();
      await expect(voteOption).toHaveClass(/bg-gray-100/);

      // Step 5: Thank you message shown
      await expect(page.getByText("ขอบคุณสำหรับการโหวต!")).toBeVisible({
        timeout: 2000,
      });

      // Step 6: Clear question
      const clearButton = page.getByRole("button", {
        name: "Clear question input",
      });
      await clearButton.click();

      // Step 7: Verify back to default state
      await expect(page.getByText("ตัวอย่างคำถาม").first()).toBeVisible({
        timeout: 2000,
      });
    });

    test("should complete custom question workflow", async ({ page }) => {
      await page.goto("./developer/chatbot-arena");

      // Step 1: Type custom question
      const input = page.getByPlaceholder("พิมพ์ข้อความที่นี่...");
      await expect(input).toBeVisible({ timeout: 5000 });
      const customQuestion = "คำถามทดสอบแบบกำหนดเอง";
      await input.fill(customQuestion);

      // Step 2: Submit question
      const sendButton = page.getByRole("button", { name: "ส่งคำถาม" });
      await sendButton.click();

      // Step 3: Verify question is displayed
      await expect(page.getByText(customQuestion)).toBeVisible({
        timeout: 2000,
      });

      // Step 4: Verify model answers from SSE stream
      await expect(page.getByText("Answer from model A")).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText("Answer from model B")).toBeVisible();

      // Step 5: Vote
      const voteOption = page
        .getByRole("button")
        .filter({ hasText: "A ดีกว่า" })
        .first();
      await voteOption.click();
      await expect(voteOption).toHaveClass(/bg-blue-50/);

      // Step 6: Thank you message
      await expect(page.getByText("ขอบคุณสำหรับการโหวต!")).toBeVisible({
        timeout: 2000,
      });
    });

    test("should handle model selection and question submission", async ({
      page,
    }) => {
      await page.goto("./developer/chatbot-arena");

      // Step 1: Select models from dropdowns (always visible)
      const dropdownTriggers = page
        .locator('[data-slot="dropdown-menu-trigger"]')
        .filter({ hasText: "สุ่มโมเดล" });
      await expect(dropdownTriggers.first()).toBeVisible({ timeout: 5000 });

      // Select ModelA for dropdown A
      await dropdownTriggers.first().click();
      const menuContentA = page.locator('[data-slot="dropdown-menu-content"]');
      await expect(menuContentA).toBeVisible({ timeout: 2000 });
      await menuContentA.getByText("ModelA").click();

      // Select ModelC for dropdown B (ModelA is excluded)
      await page
        .locator('[data-slot="dropdown-menu-trigger"]')
        .filter({ hasText: "สุ่มโมเดล" })
        .click();
      const menuContentB = page.locator(
        '[data-slot="dropdown-menu-content"][data-state="open"]',
      );
      await expect(menuContentB).toBeVisible({ timeout: 2000 });
      await menuContentB.getByText("ModelC").click();

      // Step 2: Submit a question
      const input = page.getByPlaceholder("พิมพ์ข้อความที่นี่...");
      const testQuestion = "ทดสอบการเลือกโมเดล";
      await input.fill(testQuestion);
      const sendButton = page.getByRole("button", { name: "ส่งคำถาม" });
      await sendButton.click();

      // Step 3: Verify question is displayed
      await expect(page.getByText(testQuestion)).toBeVisible({ timeout: 2000 });

      // Step 4: Verify answers appear from SSE stream
      await expect(page.getByText("Answer from model A")).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText("Answer from model B")).toBeVisible();
    });
  });
});
