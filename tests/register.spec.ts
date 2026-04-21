import { expect, test } from "@playwright/test";

test.describe("Register Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./auth/register");

    // Close cookie popup if it appears
    try {
      const cookieAcceptButton = page.getByRole("button", {
        name: /ยอมรับทั้งหมด/,
      });
      await cookieAcceptButton.waitFor({ state: "visible", timeout: 2000 });
      await cookieAcceptButton.click();
      await page.waitForTimeout(500);
    } catch {
      // Cookie popup might not be visible, continue with test
    }
  });

  test("should display registration form", async ({ page }) => {
    // Wait for the registration form to be visible
    await expect(
      page.getByRole("heading", { name: /สร้างบัญชีเพื่อเริ่มต้นใช้งาน/ }),
    ).toBeVisible();

    // Check for email input
    await expect(page.getByPlaceholder("กรอกอีเมล")).toBeVisible();

    // Check for password input
    await expect(page.getByPlaceholder("กรอกรหัสผ่าน")).toBeVisible();

    // Check for Google login button
    await expect(
      page.getByRole("button", { name: /เข้าสู่ระบบด้วย Google/ }),
    ).toBeVisible();

    // Check for submit button
    await expect(
      page.getByRole("button", { name: /สมัครสมาชิก/ }),
    ).toBeVisible();
  });

  test("should show terms checkbox after password is entered", async ({
    page,
  }) => {
    // Fill in password field
    const passwordInput = page.getByPlaceholder("กรอกรหัสผ่าน");
    await passwordInput.fill("TestPassword123");

    // Wait for terms checkbox to appear
    await expect(
      page.getByText(/ข้าพเจ้ายอมรับ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    // Verify checkbox is present
    const checkbox = page.getByRole("checkbox");
    await expect(checkbox).toBeVisible();
  });

  test("should show terms and conditions modal when clicking checkbox label", async ({
    page,
  }) => {
    // Fill in password to show the checkbox
    const passwordInput = page.getByPlaceholder("กรอกรหัสผ่าน");
    await passwordInput.fill("TestPassword123");

    // Wait for terms checkbox to appear
    await expect(
      page.getByText(/ข้าพเจ้ายอมรับ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    // Click on the terms label to open modal
    await page
      .getByText(/ข้อกำหนดการใช้งาน/, { exact: false })
      .first()
      .click();

    // Wait for modal to appear
    await expect(
      page.getByRole("heading", { name: /ข้อกำหนดการใช้งาน/ }),
    ).toBeVisible({ timeout: 5000 });

    // Verify modal has accept button (should be disabled until scrolled to bottom)
    const acceptButton = page.getByRole("button", { name: /ยอมรับ/ });
    await expect(acceptButton).toBeVisible();
  });

  test("should validate email format and show error message", async ({
    page,
  }) => {
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    const passwordInput = page.getByPlaceholder("กรอกรหัสผ่าน");
    const form = page.locator("form");

    // Fill valid password first to enable submit button
    await passwordInput.fill("ValidPassword123");

    // Wait for terms checkbox to appear and accept terms
    await expect(
      page.getByText(/ข้าพเจ้ายอมรับ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    // Open and accept terms to enable submit button
    const termsLabel = page
      .getByText(/ข้อกำหนดการใช้งาน/, { exact: false })
      .first();
    await termsLabel.click();
    await expect(
      page.getByRole("heading", { name: /ข้อกำหนดการใช้งาน/ }),
    ).toBeVisible({ timeout: 5000 });

    const modalContent = page
      .locator('[role="dialog"]')
      .locator("section")
      .first();
    await expect(modalContent).toBeVisible();
    await page.waitForTimeout(600);
    await modalContent.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      el.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    await page.waitForTimeout(100);

    const acceptButton = page.getByRole("button", { name: /ยอมรับ/ });
    await expect(acceptButton).toBeEnabled({ timeout: 5000 });
    await acceptButton.click();

    // Test invalid email formats - fill invalid email and try to submit
    const invalidEmails = [
      "invalid-email",
      "missing@domain",
      "@example.com",
      "test@",
    ];

    for (const invalidEmail of invalidEmails) {
      await emailInput.clear();
      await emailInput.fill(invalidEmail);

      // Fill valid password to keep button enabled
      await passwordInput.clear();
      await passwordInput.fill("ValidPassword123");

      // Trigger form validation by attempting to submit
      await form.evaluate((form) => {
        const event = new Event("submit", { bubbles: true, cancelable: true });
        form.dispatchEvent(event);
      });

      // Wait for validation error message to appear
      await expect(
        page.getByText(/รูปแบบอีเมลไม่ถูกต้อง/, { exact: false }),
      ).toBeVisible({ timeout: 2000 });
    }

    // Test valid email - error should disappear
    await emailInput.clear();
    await emailInput.fill("valid@example.com");

    // Trigger validation again
    await form.evaluate((form) => {
      const event = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
    });

    await page.waitForTimeout(300);

    // Error message should not be visible
    await expect(
      page.getByText(/รูปแบบอีเมลไม่ถูกต้อง/, { exact: false }),
    ).not.toBeVisible({ timeout: 2000 });
  });

  test("should show required email error message", async ({ page }) => {
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    const passwordInput = page.getByPlaceholder("กรอกรหัสผ่าน");
    const form = page.locator("form");

    // Fill valid password and accept terms to enable submit
    await passwordInput.fill("ValidPassword123");
    await expect(
      page.getByText(/ข้าพเจ้ายอมรับ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    const termsLabel = page
      .getByText(/ข้อกำหนดการใช้งาน/, { exact: false })
      .first();
    await termsLabel.click();
    await expect(
      page.getByRole("heading", { name: /ข้อกำหนดการใช้งาน/ }),
    ).toBeVisible({ timeout: 5000 });

    const modalContent = page
      .locator('[role="dialog"]')
      .locator("section")
      .first();
    await expect(modalContent).toBeVisible();
    await page.waitForTimeout(600);
    await modalContent.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      el.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    await page.waitForTimeout(100);

    const acceptButton = page.getByRole("button", { name: /ยอมรับ/ });
    await expect(acceptButton).toBeEnabled({ timeout: 5000 });
    await acceptButton.click();

    // Clear email field
    await emailInput.clear();

    // Trigger form validation
    await form.evaluate((form) => {
      const event = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
    });

    // Wait for required field error message
    await expect(
      page.getByText(/กรุณากรอกอีเมล/, { exact: false }),
    ).toBeVisible({ timeout: 2000 });
  });

  test("should validate password requirements and show error message", async ({
    page,
  }) => {
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    const passwordInput = page.getByPlaceholder("กรอกรหัสผ่าน");
    const form = page.locator("form");

    await emailInput.fill("test@example.com");

    // Accept terms first to enable submit button
    await passwordInput.fill("ValidPassword123");
    await expect(
      page.getByText(/ข้าพเจ้ายอมรับ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    const termsLabel = page
      .getByText(/ข้อกำหนดการใช้งาน/, { exact: false })
      .first();
    await termsLabel.click();
    await expect(
      page.getByRole("heading", { name: /ข้อกำหนดการใช้งาน/ }),
    ).toBeVisible({ timeout: 5000 });

    const modalContent = page
      .locator('[role="dialog"]')
      .locator("section")
      .first();
    await expect(modalContent).toBeVisible();
    await page.waitForTimeout(600);
    await modalContent.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      el.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    await page.waitForTimeout(100);

    const acceptButton = page.getByRole("button", { name: /ยอมรับ/ });
    await expect(acceptButton).toBeEnabled({ timeout: 5000 });
    await acceptButton.click();

    // Test various invalid password formats
    const invalidPasswords = [
      { password: "short", description: "too short" },
      { password: "nouppercase123", description: "missing uppercase" },
      { password: "NOLOWERCASE123", description: "missing lowercase" },
      { password: "NoNumbers", description: "missing numbers" },
    ];

    for (const { password } of invalidPasswords) {
      await passwordInput.clear();
      await passwordInput.fill(password);

      // Trigger form validation
      await form.evaluate((form) => {
        const event = new Event("submit", { bubbles: true, cancelable: true });
        form.dispatchEvent(event);
      });

      // Wait for password validation error message
      await expect(
        page.getByText(/รหัสผ่านไม่ตรงตามเงื่อนไข/, { exact: false }),
      ).toBeVisible({ timeout: 2000 });

      // Note: Button might still be enabled due to form's disabled logic,
      // but the error message confirms validation is working
    }

    // Test valid password - error should disappear
    await passwordInput.clear();
    await passwordInput.fill("ValidPassword123");

    // Trigger validation again
    await form.evaluate((form) => {
      const event = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
    });

    await page.waitForTimeout(300);

    // Error message should not be visible
    await expect(
      page.getByText(/รหัสผ่านไม่ตรงตามเงื่อนไข/, { exact: false }),
    ).not.toBeVisible({ timeout: 2000 });
  });

  test("should show required password error message", async ({ page }) => {
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    const passwordInput = page.getByPlaceholder("กรอกรหัสผ่าน");
    const form = page.locator("form");

    await emailInput.fill("test@example.com");

    // Fill password first to show terms, then accept terms
    await passwordInput.fill("ValidPassword123");
    await expect(
      page.getByText(/ข้าพเจ้ายอมรับ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    const termsLabel = page
      .getByText(/ข้อกำหนดการใช้งาน/, { exact: false })
      .first();
    await termsLabel.click();
    await expect(
      page.getByRole("heading", { name: /ข้อกำหนดการใช้งาน/ }),
    ).toBeVisible({ timeout: 5000 });

    const modalContent = page
      .locator('[role="dialog"]')
      .locator("section")
      .first();
    await expect(modalContent).toBeVisible();
    await page.waitForTimeout(600);
    await modalContent.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      el.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    await page.waitForTimeout(100);

    const acceptButton = page.getByRole("button", { name: /ยอมรับ/ });
    await expect(acceptButton).toBeEnabled({ timeout: 5000 });
    await acceptButton.click();

    // Clear password field
    await passwordInput.clear();

    // Trigger form validation
    await form.evaluate((form) => {
      const event = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
    });

    // Wait for required field error message
    await expect(
      page.getByText(/กรุณากรอกรหัสผ่าน/, { exact: false }),
    ).toBeVisible({ timeout: 2000 });
  });

  test("should show error messages for both email and password", async ({
    page,
  }) => {
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    const passwordInput = page.getByPlaceholder("กรอกรหัสผ่าน");
    const form = page.locator("form");

    // Fill invalid email
    await emailInput.fill("invalid-email");

    // Fill invalid password
    await passwordInput.fill("short");

    // Accept terms to enable submit (needed for form to be submittable)
    await expect(
      page.getByText(/ข้าพเจ้ายอมรับ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    const termsLabel = page
      .getByText(/ข้อกำหนดการใช้งาน/, { exact: false })
      .first();
    await termsLabel.click();
    await expect(
      page.getByRole("heading", { name: /ข้อกำหนดการใช้งาน/ }),
    ).toBeVisible({ timeout: 5000 });

    const modalContent = page
      .locator('[role="dialog"]')
      .locator("section")
      .first();
    await expect(modalContent).toBeVisible();
    await page.waitForTimeout(600);
    await modalContent.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      el.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    await page.waitForTimeout(100);

    const acceptButton = page.getByRole("button", { name: /ยอมรับ/ });
    await expect(acceptButton).toBeEnabled({ timeout: 5000 });
    await acceptButton.click();

    // Trigger form validation
    await form.evaluate((form) => {
      const event = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
    });

    // Both error messages should be visible
    await expect(
      page.getByText(/รูปแบบอีเมลไม่ถูกต้อง/, { exact: false }),
    ).toBeVisible({ timeout: 2000 });
    await expect(
      page.getByText(/รหัสผ่านไม่ตรงตามเงื่อนไข/, { exact: false }),
    ).toBeVisible({ timeout: 2000 });

    // Note: Both error messages are displayed, confirming validation works for both fields
  });

  test("should clear error messages when valid input is entered", async ({
    page,
  }) => {
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    const passwordInput = page.getByPlaceholder("กรอกรหัสผ่าน");
    const form = page.locator("form");

    // Fill invalid email and password
    await emailInput.fill("invalid-email");
    await passwordInput.fill("short");

    // Accept terms to enable submit
    await expect(
      page.getByText(/ข้าพเจ้ายอมรับ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    const termsLabel = page
      .getByText(/ข้อกำหนดการใช้งาน/, { exact: false })
      .first();
    await termsLabel.click();
    await expect(
      page.getByRole("heading", { name: /ข้อกำหนดการใช้งาน/ }),
    ).toBeVisible({ timeout: 5000 });

    const modalContent = page
      .locator('[role="dialog"]')
      .locator("section")
      .first();
    await expect(modalContent).toBeVisible();
    await page.waitForTimeout(600);
    await modalContent.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      el.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    await page.waitForTimeout(100);

    const acceptButton = page.getByRole("button", { name: /ยอมรับ/ });
    await expect(acceptButton).toBeEnabled({ timeout: 5000 });
    await acceptButton.click();

    // Trigger validation to show errors
    await form.evaluate((form) => {
      const event = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
    });

    await expect(
      page.getByText(/รูปแบบอีเมลไม่ถูกต้อง/, { exact: false }),
    ).toBeVisible({ timeout: 2000 });

    // Fix email - error should disappear after re-validation
    await emailInput.clear();
    await emailInput.fill("valid@example.com");
    await passwordInput.clear();
    await passwordInput.fill("ValidPassword123");

    // Trigger validation again
    await form.evaluate((form) => {
      const event = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
    });

    await page.waitForTimeout(300);

    // Error messages should not be visible
    await expect(
      page.getByText(/รูปแบบอีเมลไม่ถูกต้อง/, { exact: false }),
    ).not.toBeVisible({ timeout: 2000 });
    await expect(
      page.getByText(/รหัสผ่านไม่ตรงตามเงื่อนไข/, { exact: false }),
    ).not.toBeVisible({ timeout: 2000 });
  });

  test("should require terms acceptance", async ({ page }) => {
    // Fill in email
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    await emailInput.fill("test@example.com");

    // Fill valid password
    const passwordInput = page.getByPlaceholder("กรอกรหัสผ่าน");
    await passwordInput.fill("TestPassword123");

    // Wait for checkbox to appear
    await expect(
      page.getByText(/ข้าพเจ้ายอมรับ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    // Submit button should be disabled until terms are accepted
    const submitButton = page.getByRole("button", { name: /สมัครสมาชิก/ });
    await expect(submitButton).toBeDisabled();
  });

  test("should successfully register a new user", async ({ page }) => {
    // Mock the register API endpoint
    await page.route("**/auth/register", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        return route.continue();
      }

      const postData = request.postDataJSON();

      if (
        postData?.email === "newuser@example.com" &&
        postData?.password === "TestPassword123"
      ) {
        // Mock successful registration response
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "new-user-id",
            email: "newuser@example.com",
            firstName: "",
            lastName: "",
            roles: ["user"],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            verifiedAt: null,
            acceptTermOfUseAt: null,
          }),
        });
      } else {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Registration failed",
            code: "REGISTRATION_ERROR",
          }),
        });
      }
    });

    // Mock the login API endpoint (called after successful registration)
    await page.route("**/auth/login", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        return route.continue();
      }

      const postData = request.postDataJSON();

      if (
        postData?.email === "newuser@example.com" &&
        postData?.password === "TestPassword123"
      ) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            token: "mock-access-token",
            refreshToken: "mock-refresh-token",
            user: {
              id: "new-user-id",
              email: "newuser@example.com",
              firstName: "",
              lastName: "",
              roles: ["user"],
              emailVerified: false,
            },
            expiresIn: 3600,
          }),
        });
      }
    });

    // Fill in email
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    await emailInput.fill("newuser@example.com");

    // Fill in password
    const passwordInput = page.getByPlaceholder("กรอกรหัสผ่าน");
    await passwordInput.fill("TestPassword123");

    // Wait for terms checkbox to appear
    await expect(
      page.getByText(/ข้าพเจ้ายอมรับ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    // Open terms modal and accept
    const termsLabel = page
      .getByText(/ข้อกำหนดการใช้งาน/, { exact: false })
      .first();
    await termsLabel.click();

    // Wait for modal
    await expect(
      page.getByRole("heading", { name: /ข้อกำหนดการใช้งาน/ }),
    ).toBeVisible({ timeout: 5000 });

    // Wait for modal content to be fully rendered
    const modalContent = page
      .locator('[role="dialog"]')
      .locator("section")
      .first();
    await expect(modalContent).toBeVisible();

    // Wait for scroll listener to be attached (hook waits 500ms)
    await page.waitForTimeout(600);

    // Scroll to bottom and trigger scroll event for the hook to detect
    await modalContent.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      // Trigger scroll event
      el.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    // Wait a bit for React state to update
    await page.waitForTimeout(100);

    // Wait for scroll detection hook to update and button to become enabled
    const acceptButton = page.getByRole("button", { name: /ยอมรับ/ });
    await expect(acceptButton).toBeEnabled({ timeout: 5000 });

    // Click accept button
    await acceptButton.click();

    // Wait for modal to close
    await expect(
      page.getByRole("heading", { name: /ข้อกำหนดการใช้งาน/ }),
    ).not.toBeVisible({ timeout: 5000 });

    // Verify checkbox is now checked
    const checkbox = page.getByRole("checkbox");
    await expect(checkbox).toBeChecked();

    // Submit button should now be enabled
    const submitButton = page.getByRole("button", { name: /สมัครสมาชิก/ });
    await expect(submitButton).toBeEnabled();

    // Set up navigation wait
    const navigationPromise = page.waitForURL(
      (url) => url.pathname.includes("/auth/verify-email"),
      { timeout: 15000 },
    );

    // Submit the form
    await submitButton.click();

    // Wait for navigation to verify email page
    await navigationPromise;

    // Verify we're on the verify email page
    const currentUrl = page.url();
    expect(currentUrl).toContain("/auth/verify-email");
    expect(currentUrl).toContain("email=newuser@example.com");
  });

  test("should show error modal on registration failure", async ({ page }) => {
    // Mock the register API endpoint to return an error
    await page.route("**/auth/register", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        return route.continue();
      }

      // Mock error response
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Email already exists",
          code: "EMAIL_ALREADY_EXISTS",
        }),
      });
    });

    // Fill in email
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    await emailInput.fill("existing@example.com");

    // Fill in password
    const passwordInput = page.getByPlaceholder("กรอกรหัสผ่าน");
    await passwordInput.fill("TestPassword123");

    // Wait for terms checkbox to appear (React state update after password is set)
    await expect(
      page.getByText(/ข้าพเจ้ายอมรับ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    // Open terms modal and accept (same flow as successful registration)
    const termsLabel = page
      .getByText(/ข้อกำหนดการใช้งาน/, { exact: false })
      .first();
    await termsLabel.click();

    // Wait for modal
    await expect(
      page.getByRole("heading", { name: /ข้อกำหนดการใช้งาน/ }),
    ).toBeVisible({ timeout: 5000 });

    // Wait for modal content to be fully rendered
    const modalContent = page
      .locator('[role="dialog"]')
      .locator("section")
      .first();
    await expect(modalContent).toBeVisible();

    // Wait for scroll listener to be attached (hook waits 500ms)
    await page.waitForTimeout(600);

    // Scroll to bottom and trigger scroll event for the hook to detect
    await modalContent.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      // Trigger scroll event
      el.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    // Wait a bit for React state to update
    await page.waitForTimeout(100);

    // Wait for scroll detection hook to update and button to become enabled
    const acceptButton = page.getByRole("button", { name: /ยอมรับ/ });
    await expect(acceptButton).toBeEnabled({ timeout: 5000 });

    // Click accept button
    await acceptButton.click();

    // Wait for modal to close
    await expect(
      page.getByRole("heading", { name: /ข้อกำหนดการใช้งาน/ }),
    ).not.toBeVisible({ timeout: 5000 });

    // Verify checkbox is now checked
    const checkbox = page.getByRole("checkbox");
    await expect(checkbox).toBeChecked({ timeout: 2000 });

    // Set up navigation wait (should NOT navigate on error)
    // Instead, wait for error modal

    // Submit the form
    const submitButton = page.getByRole("button", { name: /สมัครสมาชิก/ });
    await submitButton.click();

    // Wait for error modal to appear after API call completes
    // Error modal should be visible with error message
    await expect(
      page
        .getByRole("dialog")
        .getByText(/เกิดข้อผิดพลาด|Email already exists/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    // Verify the error modal has a close/ok button
    const okButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /ตกลง/ });
    await expect(okButton).toBeVisible();
  });

  test("should navigate to login page when clicking login link", async ({
    page,
  }) => {
    // Find and click the login link
    const loginLink = page.getByRole("link", { name: /เข้าสู่ระบบ/ });
    await expect(loginLink).toBeVisible();

    // Click the link
    await loginLink.click();

    // Wait for navigation to login page
    await page.waitForURL((url) => url.pathname.includes("/auth/login"), {
      timeout: 5000,
    });

    // Verify we're on the login page
    await expect(
      page.getByRole("heading", { name: /เข้าสู่ระบบเพื่อใช้งาน/ }),
    ).toBeVisible();
  });
});
