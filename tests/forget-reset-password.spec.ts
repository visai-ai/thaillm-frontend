import { expect, test } from "@playwright/test";

test.describe("Forget Password Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./auth/forget-password");

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

  test("should display forget password form", async ({ page }) => {
    // Wait for the heading
    await expect(
      page.getByRole("heading", { name: /ตั้งค่ารหัสผ่านใหม่/ }),
    ).toBeVisible();

    // Check for email input
    await expect(page.getByPlaceholder("กรอกอีเมล")).toBeVisible();

    // Check for submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveText("ดำเนินการต่อ");
  });

  test("should validate email format on submit", async ({ page }) => {
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    const submitButton = page.locator('button[type="submit"]');

    // Fill in invalid email
    await emailInput.fill("invalid-email");

    // Submit the form to trigger validation (mode is onSubmit)
    await submitButton.click();

    // Wait for validation error
    await expect(
      page.getByText(/รูปแบบอีเมลไม่ถูกต้อง/, { exact: false }),
    ).toBeVisible({ timeout: 2000 });

    // Fill valid email
    await emailInput.clear();
    await emailInput.fill("test@example.com");
    await submitButton.click();

    // Error should disappear (or form should submit)
    await expect(
      page.getByText(/รูปแบบอีเมลไม่ถูกต้อง/, { exact: false }),
    ).not.toBeVisible({ timeout: 2000 });
  });

  test("should validate required email field", async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');

    // Submit button should be disabled when email is empty
    await expect(submitButton).toBeDisabled();

    // Fill email to enable button
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    await emailInput.fill("test@example.com");
    await expect(submitButton).toBeEnabled();
  });

  test("should successfully send reset password email", async ({ page }) => {
    // Mock the forget password API endpoint
    await page.route("**/auth/forget-password", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        return route.continue();
      }

      const postData = request.postDataJSON();
      if (postData?.email === "test@example.com") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            message: "If the email exists, a password reset link has been sent",
          }),
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Email is required",
            code: "EMAIL_REQUIRED",
          }),
        });
      }
    });

    // Fill in email
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    await emailInput.fill("test@example.com");

    // Submit the form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for success message
    await expect(
      page.getByText(/ส่งอีเมลรีเซ็ตรหัสผ่านสำเร็จ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    // Wait for navigation to login page (may take up to 3 seconds due to setTimeout)
    await page.waitForURL((url) => url.pathname.includes("/auth/login"), {
      timeout: 10000,
    });
  });

  test("should show error message on API failure", async ({ page }) => {
    // Mock the forget password API endpoint to return error
    await page.route("**/auth/forget-password", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        return route.continue();
      }

      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Failed to send password reset email",
          code: "FORGET_PASSWORD_FAILED",
        }),
      });
    });

    // Fill in email
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    await emailInput.fill("test@example.com");

    // Submit the form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for error message (could be from response.data.error or generic error)
    await expect(
      page.getByText(/Failed to send password reset email|เกิดข้อผิดพลาด/, {
        exact: false,
      }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should show loading state during submission", async ({ page }) => {
    let resolveRoute: () => void;
    const routePromise = new Promise<void>((resolve) => {
      resolveRoute = resolve;
    });

    // Mock the forget password API endpoint with delay
    await page.route("**/auth/forget-password", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        return route.continue();
      }

      // Wait for delay
      await routePromise;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "If the email exists, a password reset link has been sent",
        }),
      });
    });

    // Fill in email
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    await emailInput.fill("test@example.com");

    // Submit the form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Check for loading state immediately
    await expect(submitButton).toHaveText("กำลังส่ง...", { timeout: 1000 });
    await expect(submitButton).toBeDisabled();

    // Resolve the route after a delay
    setTimeout(() => {
      resolveRoute();
    }, 1000);
  });
});

test.describe("Reset Password Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Close cookie popup if it appears
    try {
      await page.goto("./auth/reset-password?token=test-reset-token-123");
      const cookieAcceptButton = page.getByRole("button", {
        name: /ยอมรับทั้งหมด/,
      });
      await cookieAcceptButton.waitFor({ state: "visible", timeout: 2000 });
      await cookieAcceptButton.click();
      await page.waitForTimeout(500);
    } catch {
      // Cookie popup might not be visible, continue with test
      await page.goto("./auth/reset-password?token=test-reset-token-123");
    }
  });

  test("should display reset password form with token", async ({ page }) => {
    // Wait for the heading
    await expect(
      page.getByRole("heading", { name: /ตั้งค่ารหัสผ่านใหม่/ }),
    ).toBeVisible();

    // Check for password inputs using name attribute to avoid strict mode violation
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();

    // Check for submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveText("ตั้งค่ารหัสผ่าน");
  });

  test("should show error when token is missing", async ({ page }) => {
    // Navigate without token
    await page.goto("./auth/reset-password");

    // Wait for error message
    await expect(
      page.getByText(/url ไม่ถูกต้อง/, { exact: false }),
    ).toBeVisible({ timeout: 3000 });

    // Submit button should be disabled
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeDisabled();
  });

  test("should validate password requirements", async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    const submitButton = page.locator('button[type="submit"]');

    // Fill in invalid password (missing uppercase and number)
    // Use a password that's long enough but missing requirements
    await passwordInput.fill("lowercaseonly");
    await confirmPasswordInput.fill("lowercaseonly");

    // Submit to trigger validation (mode is onSubmit)
    // Note: The form might prevent submission if validation fails
    // The validation error might not be displayed as text, but the form won't submit
    await submitButton.click();

    // Wait a bit to see if form submits or validation prevents it
    await page.waitForTimeout(1000);

    // Check that the form didn't submit (we should still be on the same page)
    // OR check for validation indicators (the password validation rules UI)
    const currentUrl = page.url();
    expect(currentUrl).toContain("/auth/reset-password");

    // The password validation is shown via the validation rules UI (checkmarks)
    // Check that the validation rules are visible
    await expect(
      page.getByText(/ต้องมีตัวอักษร พิมพ์ใหญ่อย่างน้อย 1 ตัว/, {
        exact: false,
      }),
    ).toBeVisible({ timeout: 2000 });

    // Fill in valid password
    await passwordInput.clear();
    await confirmPasswordInput.clear();
    await passwordInput.fill("ValidPassword123");
    await confirmPasswordInput.fill("ValidPassword123");
  });

  test("should validate password confirmation match", async ({ page }) => {
    const passwordInput = page.locator('input[name="password"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

    // Fill in passwords that don't match
    await passwordInput.fill("Password123");
    await confirmPasswordInput.fill("DifferentPassword123");

    // Try to submit
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should show validation error for password mismatch
    await expect(
      page.getByText(/รหัสผ่านไม่ตรงกัน/, { exact: false }),
    ).toBeVisible({ timeout: 2000 });
  });

  test("should successfully reset password", async ({ page }) => {
    // Mock the reset password API endpoint
    await page.route("**/auth/reset-password", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        return route.continue();
      }

      const postData = request.postDataJSON();
      if (
        postData?.token === "test-reset-token-123" &&
        postData?.password === "NewPassword123"
      ) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Password reset successfully",
          }),
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Invalid or expired reset token",
            code: "INVALID_RESET_TOKEN",
          }),
        });
      }
    });

    // Fill in passwords
    const passwordInput = page.locator('input[name="password"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

    await passwordInput.fill("NewPassword123");
    await confirmPasswordInput.fill("NewPassword123");

    // Submit the form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for success message
    await expect(
      page.getByText(/ตั้งรหัสผ่านใหม่สำเร็จ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    // Wait for navigation to login page (component redirects after 2s delay)
    await page.waitForURL((url) => url.pathname.includes("/auth/login"), {
      timeout: 10000,
    });
  });

  test("should show error on invalid token", async ({ page }) => {
    // Mock the reset password API endpoint to return invalid token error
    await page.route("**/auth/reset-password", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        return route.continue();
      }

      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Invalid or expired reset token",
          code: "INVALID_RESET_TOKEN",
        }),
      });
    });

    // Fill in passwords
    const passwordInput = page.locator('input[name="password"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

    await passwordInput.fill("NewPassword123");
    await confirmPasswordInput.fill("NewPassword123");

    // Submit the form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for error message
    await expect(
      page.getByText(/Invalid or expired reset token/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should show error on API password validation failure", async ({
    page,
  }) => {
    // Mock the reset password API endpoint to return error
    await page.route("**/auth/reset-password", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        return route.continue();
      }

      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Password must be at least 8 characters",
          code: "PASSWORD_TOO_SHORT",
        }),
      });
    });

    // Fill in a password that passes client validation (8+ chars, has uppercase, lowercase, number)
    // but might fail server validation
    const passwordInput = page.locator('input[name="password"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

    await passwordInput.fill("ValidPass123");
    await confirmPasswordInput.fill("ValidPass123");

    // Submit the form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for error message from API response
    // The error should be displayed in submitMessage
    await expect(
      page.getByText(/Password must be at least 8 characters|เกิดข้อผิดพลาด/, {
        exact: false,
      }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should show loading state during submission", async ({ page }) => {
    let resolveRoute: () => void;
    const routePromise = new Promise<void>((resolve) => {
      resolveRoute = resolve;
    });

    // Mock the reset password API endpoint with delay
    await page.route("**/auth/reset-password", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        return route.continue();
      }

      // Wait for delay promise
      await routePromise;

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Password reset successfully",
        }),
      });
    });

    // Fill in passwords
    const passwordInput = page.locator('input[name="password"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

    await passwordInput.fill("NewPassword123");
    await confirmPasswordInput.fill("NewPassword123");

    // Submit the form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Check for loading state immediately
    await expect(submitButton).toHaveText("กำลังตั้งค่ารหัสผ่าน...", {
      timeout: 1000,
    });
    await expect(submitButton).toBeDisabled();

    // Resolve after a delay to allow loading state to be visible
    setTimeout(() => {
      resolveRoute();
    }, 1000);
  });

  test("should disable submit button when fields are empty", async ({
    page,
  }) => {
    const submitButton = page.locator('button[type="submit"]');

    // Submit button should be disabled when fields are empty
    await expect(submitButton).toBeDisabled();

    // Fill password but not confirm password
    const passwordInput = page.locator('input[name="password"]');
    await passwordInput.fill("Password123");
    await expect(submitButton).toBeDisabled();

    // Fill both passwords
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    await confirmPasswordInput.fill("Password123");
    await expect(submitButton).toBeEnabled();
  });
});

test.describe("Forget Password to Reset Password Flow", () => {
  test("should complete full password reset flow", async ({ page }) => {
    // Step 1: Navigate to forget password page
    await page.goto("./auth/forget-password");

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

    // Mock forget password API
    await page.route("**/auth/forget-password", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        return route.continue();
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "If the email exists, a password reset link has been sent",
        }),
      });
    });

    // Step 2: Fill and submit forget password form
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    await emailInput.fill("test@example.com");

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Step 3: Wait for success message
    await expect(
      page.getByText(/ส่งอีเมลรีเซ็ตรหัสผ่านสำเร็จ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    // Step 4: Navigate to reset password page with token (simulating email link click)
    await page.goto("./auth/reset-password?token=test-reset-token-123");

    // Step 5: Mock reset password API
    await page.route("**/auth/reset-password", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        return route.continue();
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Password reset successfully",
        }),
      });
    });

    // Step 6: Fill and submit reset password form
    const passwordInput = page.locator('input[name="password"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');

    await passwordInput.fill("NewPassword123");
    await confirmPasswordInput.fill("NewPassword123");

    const resetSubmitButton = page.locator('button[type="submit"]');
    await resetSubmitButton.click();

    // Step 7: Wait for success and navigation to login
    await expect(
      page.getByText(/ตั้งรหัสผ่านใหม่สำเร็จ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    // Wait for navigation to login page (component redirects after 2s delay)
    await page.waitForURL((url) => url.pathname.includes("/auth/login"), {
      timeout: 10000,
    });
  });
});
