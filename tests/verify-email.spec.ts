import { expect, test } from "@playwright/test";

test.describe("Verify Email Flow", () => {
  test.describe("Verify Email Page", () => {
    test.beforeEach(async ({ page }) => {
      // Mock the getMe API endpoint (used for polling)
      await page.route("**/auth/me", async (route) => {
        const request = route.request();
        if (request.method() !== "GET") {
          return route.continue();
        }

        // Default: email not verified
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "user-id",
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
            roles: ["user"],
            emailVerified: false,
          }),
        });
      });
    });

    test("should display verify email page with email parameter", async ({
      page,
    }) => {
      await page.goto("./auth/verify-email?email=test@example.com");

      // Wait for the page to load (Suspense might show loading first)
      await expect(
        page.getByRole("heading", { name: /โปรดยืนยันอีเมล/ }),
      ).toBeVisible({ timeout: 5000 });

      // Check for email in the message
      await expect(
        page.getByText(/เราได้ส่งลิงก์ยืนยันตัวตนไปที่อีเมล test@example.com/, {
          exact: false,
        }),
      ).toBeVisible();

      // Check for resend email button
      await expect(
        page.getByRole("button", { name: /ส่งอีเมลใหม่อีกครั้ง/ }),
      ).toBeVisible();
    });

    test("should display resend email button and countdown", async ({
      page,
    }) => {
      // Mock resend email API
      await page.route("**/auth/send-verification-email", async (route) => {
        const request = route.request();
        if (request.method() !== "POST") {
          return route.continue();
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ message: "Verification email sent" }),
        });
      });

      await page.goto("./auth/verify-email?email=test@example.com");

      await expect(
        page.getByRole("heading", { name: /โปรดยืนยันอีเมล/ }),
      ).toBeVisible({ timeout: 5000 });

      const resendButton = page.getByRole("button", {
        name: /ส่งอีเมลใหม่อีกครั้ง/,
      });
      await expect(resendButton).toBeVisible();
      await expect(resendButton).toBeEnabled();

      // Click resend button
      await resendButton.click();

      // Countdown should appear (this indicates the state has changed)
      await expect(
        page.getByText(/ใน \d+ วินาที/, { exact: false }),
      ).toBeVisible({ timeout: 5000 });

      // Button should be disabled after countdown starts
      await expect(resendButton).toBeDisabled({ timeout: 2000 });

      // Wait a bit to see countdown decrease
      await page.waitForTimeout(2000);

      // Countdown should be decreasing (should be less than 61)
      const countdownText = await page
        .getByText(/ใน \d+ วินาที/, { exact: false })
        .textContent();
      expect(countdownText).toMatch(/ใน \d+ วินาที/);
    });

    test("should poll for email verification status", async ({ page }) => {
      let pollCount = 0;

      // Mock getMe to return unverified first, then verified
      await page.route("**/auth/me", async (route) => {
        const request = route.request();
        if (request.method() !== "GET") {
          return route.continue();
        }

        pollCount++;

        if (pollCount >= 2) {
          // After second poll, return verified
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
        } else {
          // First poll: not verified
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "user-id",
              email: "test@example.com",
              firstName: "Test",
              lastName: "User",
              roles: ["user"],
              emailVerified: false,
            }),
          });
        }
      });

      await page.goto("./auth/verify-email?email=test@example.com");

      await expect(
        page.getByRole("heading", { name: /โปรดยืนยันอีเมล/ }),
      ).toBeVisible({ timeout: 5000 });

      // Wait for polling to detect verified email (poll happens every 5 seconds)
      // Wait a bit longer to allow for polling
      await page.waitForTimeout(6000);

      // Should navigate to verified-email page
      await page.waitForURL(
        (url) => url.pathname.includes("/auth/verified-email"),
        { timeout: 10000 },
      );

      // Verify we're on the verified email page
      await expect(
        page.getByRole("heading", { name: /ลงทะเบียนเสร็จสมบูรณ์/ }),
      ).toBeVisible();
    });

    test("should handle resend email API error gracefully", async ({
      page,
    }) => {
      // Mock resend email API to return error
      await page.route("**/auth/send-verification-email", async (route) => {
        const request = route.request();
        if (request.method() !== "POST") {
          return route.continue();
        }

        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Failed to send verification email",
            code: "EMAIL_SEND_ERROR",
          }),
        });
      });

      await page.goto("./auth/verify-email?email=test@example.com");

      await expect(
        page.getByRole("heading", { name: /โปรดยืนยันอีเมล/ }),
      ).toBeVisible({ timeout: 5000 });

      const resendButton = page.getByRole("button", {
        name: /ส่งอีเมลใหม่อีกครั้ง/,
      });

      // Click resend button
      await resendButton.click();

      // Button should still be disabled (countdown starts even on error)
      await expect(resendButton).toBeDisabled({ timeout: 2000 });
    });

    test("should display correct email from URL parameter", async ({
      page,
    }) => {
      const testEmail = "user@example.com";
      await page.goto(`./auth/verify-email?email=${testEmail}`);

      await expect(
        page.getByRole("heading", { name: /โปรดยืนยันอีเมล/ }),
      ).toBeVisible({ timeout: 5000 });

      // Verify email is displayed in the message
      await expect(
        page.getByText(
          new RegExp(
            `เราได้ส่งลิงก์ยืนยันตัวตนไปที่อีเมล ${testEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
            "i",
          ),
        ),
      ).toBeVisible();
    });
  });

  test.describe("Verified Email Page", () => {
    test.beforeEach(async ({ page }) => {
      // Set authentication cookies to allow access to /app routes
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
            roles: ["user"],
          }),
          domain: "localhost",
          path: "/",
        },
      ]);
    });

    test("should display verified email success page", async ({ page }) => {
      await page.goto("./auth/verified-email");

      // Check for success heading
      await expect(
        page.getByRole("heading", { name: /ลงทะเบียนเสร็จสมบูรณ์/ }),
      ).toBeVisible();

      // Check for success message
      await expect(
        page.getByText(/คุณสามารถเข้าใช้งานด้วยอีเมลและรหัสผ่านของคุณ/, {
          exact: false,
        }),
      ).toBeVisible();

      // Check for countdown message
      await expect(
        page.getByText(/เรากำลังพาคุณไปยังหน้าเข้าสู่ระบบใน/, {
          exact: false,
        }),
      ).toBeVisible();
    });

    test("should show countdown timer and navigate to chatbot", async ({
      page,
    }) => {
      await page.goto("./auth/verified-email");

      await expect(
        page.getByRole("heading", { name: /ลงทะเบียนเสร็จสมบูรณ์/ }),
      ).toBeVisible();

      // Check initial countdown (should be 5)
      await expect(
        page.getByText(/เรากำลังพาคุณไปยังหน้าเข้าสู่ระบบใน 5 วินาที/, {
          exact: false,
        }),
      ).toBeVisible({ timeout: 1000 });

      // Wait for countdown to decrease
      await page.waitForTimeout(2000);

      // Countdown should have decreased
      const countdownText = await page
        .getByText(/เรากำลังพาคุณไปยังหน้าเข้าสู่ระบบใน \d+ วินาที/, {
          exact: false,
        })
        .textContent();
      expect(countdownText).toMatch(
        /เรากำลังพาคุณไปยังหน้าเข้าสู่ระบบใน \d+ วินาที/,
      );

      // Wait for countdown to reach 0 and navigate
      await page.waitForURL((url) => !url.pathname.includes("/auth/"), {
        timeout: 10000,
      });

      // Verify we're on the chatbot page
      const currentUrl = page.url();
      expect(currentUrl).not.toContain("/auth/");
    });

    test("should display countdown decreasing over time", async ({ page }) => {
      await page.goto("./auth/verified-email");

      await expect(
        page.getByRole("heading", { name: /ลงทะเบียนเสร็จสมบูรณ์/ }),
      ).toBeVisible();

      // Check countdown values at different times
      let previousCount = 5;

      // Wait and check countdown decreases
      for (let i = 0; i < 3; i++) {
        await page.waitForTimeout(1000);

        const countdownText = await page
          .getByText(/เรากำลังพาคุณไปยังหน้าเข้าสู่ระบบใน (\d+) วินาที/, {
            exact: false,
          })
          .textContent();

        if (countdownText) {
          const match = countdownText.match(/(\d+)/);
          if (match) {
            const currentCount = parseInt(match[1], 10);
            // Countdown should be decreasing
            expect(currentCount).toBeLessThanOrEqual(previousCount);
            previousCount = currentCount;
          }
        }
      }
    });
  });

  test.describe("Complete Email Verification Flow", () => {
    test("should complete full flow from verify to verified to chatbot", async ({
      page,
    }) => {
      // Set authentication cookies to allow access to /app routes
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
            roles: ["user"],
          }),
          domain: "localhost",
          path: "/",
        },
      ]);
      let pollCount = 0;

      // Mock getMe to return verified after first poll
      await page.route("**/auth/me", async (route) => {
        const request = route.request();
        if (request.method() !== "GET") {
          return route.continue();
        }

        pollCount++;

        if (pollCount >= 1) {
          // After first poll, return verified
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
        } else {
          // First poll: not verified
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: "user-id",
              email: "test@example.com",
              firstName: "Test",
              lastName: "User",
              roles: ["user"],
              emailVerified: false,
            }),
          });
        }
      });

      // Start at verify-email page
      await page.goto("./auth/verify-email?email=test@example.com");

      // Wait for verify email page
      await expect(
        page.getByRole("heading", { name: /โปรดยืนยันอีเมล/ }),
      ).toBeVisible({ timeout: 5000 });

      // Wait for polling to detect verified email
      await page.waitForTimeout(6000);

      // Should navigate to verified-email page
      await page.waitForURL(
        (url) => url.pathname.includes("/auth/verified-email"),
        { timeout: 10000 },
      );

      // Verify we're on verified email page
      await expect(
        page.getByRole("heading", { name: /ลงทะเบียนเสร็จสมบูรณ์/ }),
      ).toBeVisible();

      // Wait for countdown and navigation to chatbot
      await page.waitForURL((url) => !url.pathname.includes("/auth/"), {
        timeout: 10000,
      });

      // Verify final destination
      const currentUrl = page.url();
      expect(currentUrl).not.toContain("/auth/");
    });
  });
});
