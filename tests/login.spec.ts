import { expect, test } from "@playwright/test";

test.describe("Login Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("./auth/login");

    // Close cookie popup if it appears
    try {
      const cookieAcceptButton = page.getByRole("button", {
        name: /ยอมรับทั้งหมด/,
      });
      await cookieAcceptButton.waitFor({ state: "visible", timeout: 2000 });
      await cookieAcceptButton.click();
      // Wait a bit for the popup to disappear
      await page.waitForTimeout(500);
    } catch {
      // Cookie popup might not be visible, continue with test
    }
  });

  test("should display login form", async ({ page }) => {
    // Wait for the login form to be visible
    await expect(
      page.getByRole("heading", { name: /เข้าสู่ระบบเพื่อใช้งาน/ }),
    ).toBeVisible();

    // Check for email input
    await expect(page.getByPlaceholder("กรอกอีเมล")).toBeVisible();

    // Check for password input
    await expect(page.getByPlaceholder("กรอกรหัสผ่าน")).toBeVisible();

    // Check for Google login button
    await expect(
      page.getByRole("button", { name: /เข้าสู่ระบบด้วย Google/ }),
    ).toBeVisible();

    // Check for submit button (use type="submit" to avoid matching Google button)
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check for forgot password link
    await expect(page.getByRole("link", { name: /ลืมรหัสผ่าน/ })).toBeVisible();

    // Check for register link
    await expect(page.getByRole("link", { name: /สมัครสมาชิก/ })).toBeVisible();
  });

  test("should validate email format", async ({ page }) => {
    // Fill in invalid email
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    await emailInput.fill("invalid-email");

    // Blur to trigger validation
    await emailInput.blur();

    // Wait for validation error to appear
    await expect(
      page.getByText(/รูปแบบอีเมลไม่ถูกต้อง/, { exact: false }),
    ).toBeVisible({ timeout: 2000 });

    // Fill valid email
    await emailInput.clear();
    await emailInput.fill("test@example.com");
    await emailInput.blur();

    // Error should disappear
    await expect(
      page.getByText(/รูปแบบอีเมลไม่ถูกต้อง/, { exact: false }),
    ).not.toBeVisible({ timeout: 2000 });
  });

  test("should validate required fields", async ({ page }) => {
    // Try to submit with empty fields
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for validation errors
    await expect(
      page.getByText(/กรุณากรอกอีเมล/, { exact: false }),
    ).toBeVisible({ timeout: 2000 });
  });

  test("should show error modal on invalid credentials", async ({ page }) => {
    // Mock the login API endpoint to return an error
    await page.route("**/auth/login", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        return route.continue();
      }

      // Mock error response
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Invalid credentials",
          code: "INVALID_CREDENTIALS",
        }),
      });
    });

    // Fill in email
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    await emailInput.fill("wrong@example.com");

    // Fill in password
    const passwordInput = page.getByPlaceholder("กรอกรหัสผ่าน");
    await passwordInput.fill("wrongpassword");

    // Submit the form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for error modal to appear (check for the description text specifically)
    await expect(
      page.getByRole("dialog").getByText(/อีเมลหรือรหัสผ่านไม่ถูกต้อง/, {
        exact: false,
      }),
    ).toBeVisible({ timeout: 5000 });

    // Verify the error modal has a close/ok button
    const okButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /ตกลง/ });
    await expect(okButton).toBeVisible();

    // Close the modal
    await okButton.click();

    // Verify modal is closed
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 2000 });
  });

  test("should navigate to forgot password page", async ({ page }) => {
    // Find and click the forgot password link
    const forgotPasswordLink = page.getByRole("link", { name: /ลืมรหัสผ่าน/ });
    await expect(forgotPasswordLink).toBeVisible();

    // Click the link
    await forgotPasswordLink.click();

    // Wait for navigation to forgot password page
    await page.waitForURL(
      (url) => url.pathname.includes("/auth/forget-password"),
      {
        timeout: 10000,
      },
    );

    // Verify we're on the forgot password page
    const currentUrl = page.url();
    expect(currentUrl).toContain("/auth/forget-password");
  });

  test("should navigate to register page", async ({ page }) => {
    // Find and click the register link
    const registerLink = page.getByRole("link", { name: /สมัครสมาชิก/ });
    await expect(registerLink).toBeVisible();

    // Click the link
    await registerLink.click();

    // Wait for navigation to register page
    await page.waitForURL((url) => url.pathname.includes("/auth/register"), {
      timeout: 10000,
    });

    // Verify we're on the register page
    await expect(
      page.getByRole("heading", { name: /สร้างบัญชีเพื่อเริ่มต้นใช้งาน/ }),
    ).toBeVisible();
  });

  test("should successfully login with verified email", async ({ page }) => {
    // Mock the login API endpoint
    await page.route("**/auth/login", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        return route.continue();
      }

      const postData = request.postDataJSON();

      if (
        postData?.email === "verified@example.com" &&
        postData?.password === "TestPassword123"
      ) {
        // Mock successful login response with verified email
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            token: "mock-access-token",
            refreshToken: "mock-refresh-token",
            user: {
              id: "verified-user-id",
              email: "verified@example.com",
              firstName: "Verified",
              lastName: "User",
              roles: ["user"],
              emailVerified: true,
            },
            expiresIn: 3600,
          }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Invalid credentials",
            code: "INVALID_CREDENTIALS",
          }),
        });
      }
    });

    // Fill in email
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    await emailInput.fill("verified@example.com");

    // Fill in password
    const passwordInput = page.getByPlaceholder("กรอกรหัสผ่าน");
    await passwordInput.fill("TestPassword123");

    // Set up navigation wait
    const navigationPromise = page.waitForURL(
      (url) => !url.pathname.includes("/auth/"),
      { timeout: 15000 },
    );

    // Submit the form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for navigation to chatbot page
    await navigationPromise;

    // Verify we're on the chatbot page
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/auth/");
  });

  test("should redirect to verify email page for unverified email", async ({
    page,
  }) => {
    // Mock the login API endpoint
    await page.route("**/auth/login", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        return route.continue();
      }

      const postData = request.postDataJSON();

      if (
        postData?.email === "unverified@example.com" &&
        postData?.password === "TestPassword123"
      ) {
        // Mock successful login response with unverified email
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            token: "mock-access-token",
            refreshToken: "mock-refresh-token",
            user: {
              id: "unverified-user-id",
              email: "unverified@example.com",
              firstName: "Unverified",
              lastName: "User",
              roles: ["user"],
              emailVerified: false,
            },
            expiresIn: 3600,
          }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Invalid credentials",
            code: "INVALID_CREDENTIALS",
          }),
        });
      }
    });

    // Fill in email
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    await emailInput.fill("unverified@example.com");

    // Fill in password
    const passwordInput = page.getByPlaceholder("กรอกรหัสผ่าน");
    await passwordInput.fill("TestPassword123");

    // Set up navigation wait
    const navigationPromise = page.waitForURL(
      (url) => url.pathname.includes("/auth/verify-email"),
      { timeout: 15000 },
    );

    // Submit the form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for navigation to verify email page
    await navigationPromise;

    // Verify we're on the verify email page
    const currentUrl = page.url();
    expect(currentUrl).toContain("/auth/verify-email");
    expect(currentUrl).toContain("email=unverified@example.com");
  });

  test("should have Google login button visible and clickable", async ({
    page,
  }) => {
    // Check Google login button is visible
    const googleButton = page.getByRole("button", {
      name: /เข้าสู่ระบบด้วย Google/,
    });
    await expect(googleButton).toBeVisible();

    // Verify button is clickable (not disabled)
    await expect(googleButton).toBeEnabled();

    // Click the button (we can't fully test OAuth flow, but we can verify it doesn't crash)
    await googleButton.click();

    // The button should trigger navigation or OAuth flow
    // We'll just verify the page doesn't crash
    await page.waitForTimeout(1000);
  });

  test("should toggle remember me checkbox", async ({ page }) => {
    // Find the remember me checkbox by finding the label first, then the associated checkbox
    const label = page.getByText(/จำฉันไว้ในระบบ/);
    await expect(label).toBeVisible();

    // Find the checkbox by the label's associated id (htmlFor attribute)
    const checkboxId = await label.getAttribute("for");
    const checkbox = checkboxId
      ? page.locator(`#${checkboxId}`)
      : page.getByRole("checkbox").first();
    await expect(checkbox).toBeVisible();

    // Initially unchecked
    await expect(checkbox).not.toBeChecked();

    // Click to check
    await checkbox.click();
    await expect(checkbox).toBeChecked({ timeout: 1000 });

    // Click to uncheck
    await checkbox.click();
    await expect(checkbox).not.toBeChecked({ timeout: 1000 });
  });

  test("login with admin credentials", async ({ page }) => {
    // Mock the login API endpoint
    await page.route("**/auth/login", async (route) => {
      const request = route.request();
      if (request.method() !== "POST") {
        return route.continue();
      }

      const postData = request.postDataJSON();

      if (
        postData?.email === "Admin123@gmail.com" &&
        postData?.password === "Admin123@gmail.com"
      ) {
        // Mock successful login response
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            token: "mock-access-token",
            refreshToken: "mock-refresh-token",
            user: {
              id: "admin-user-id",
              email: "Admin123@gmail.com",
              firstName: "Admin",
              lastName: "User",
              roles: ["admin"],
              emailVerified: true,
            },
            expiresIn: 3600,
          }),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Invalid credentials",
            code: "INVALID_CREDENTIALS",
          }),
        });
      }
    });

    // Mock getMe API endpoint (called by app layout after login)
    await page.route("**/auth/me", async (route) => {
      const request = route.request();
      if (request.method() !== "GET") {
        return route.continue();
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "admin-user-id",
          email: "Admin123@gmail.com",
          firstName: "Admin",
          lastName: "User",
          roles: ["admin"],
          emailVerified: true,
        }),
      });
    });

    // Mock chat rooms API endpoint (called by sidebar on chatbot page)
    await page.route("**/chat/rooms", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "chatroom-id",
            userId: "admin-user-id",
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

    // Wait for the login form to be visible
    await expect(
      page.getByRole("heading", { name: /เข้าสู่ระบบเพื่อใช้งาน/ }),
    ).toBeVisible();

    // Fill in email field - using placeholder as alternative if label doesn't work
    const emailInput = page.getByPlaceholder("กรอกอีเมล");
    await emailInput.fill("Admin123@gmail.com");

    // Fill in password field - using placeholder as alternative if label doesn't work
    const passwordInput = page.getByPlaceholder("กรอกรหัสผ่าน");
    await passwordInput.fill("Admin123@gmail.com");

    // Click the submit button
    await page.locator('button[type="submit"]').click();

    // Wait for navigation to complete
    await page.waitForURL(
      (url) =>
        !url.pathname.includes("/auth/") ||
        url.pathname.includes("/auth/verify-email"),
      { timeout: 15000 },
    );

    // Verify we're on the expected page after login
    const currentUrl = page.url();
    expect(
      !currentUrl.includes("/auth/") ||
        currentUrl.includes("/auth/verify-email"),
    ).toBeTruthy();

    // If we're on the chatbot page, wait for it to load and verify UI elements
    if (!currentUrl.includes("/auth/")) {
      // Wait for the page to fully load (network idle)
      await page.waitForLoadState("networkidle");

      // Wait for the chatbot input field to appear (confirms the page loaded)
      await expect(page.getByPlaceholder("พิมพ์ข้อความที่นี่...")).toBeVisible({
        timeout: 10000,
      });

      // Verify sidebar is visible by checking for the sidebar group label
      // Using filter to get the specific sidebar element and avoid strict mode violation
      const sidebarLabel = page
        .locator('[data-sidebar="group-label"]')
        .filter({ hasText: "แชทบอท" })
        .first();
      await expect(sidebarLabel).toBeVisible({ timeout: 5000 });
    }
  });
});
