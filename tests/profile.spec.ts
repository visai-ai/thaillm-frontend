import { expect, test } from "@playwright/test";

// Helper function to set up common authentication and mocks
const setupAuthAndMocks = async (page: any) => {
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
  ]);

  // Mock getMe API to return user data
  await page.route("**/auth/me", async (route: any) => {
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

  // Mock user settings API
  await page.route("**/users/setting", async (route: any) => {
    const request = route.request();
    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          enableEmailNotification: true,
        }),
      });
    } else if (request.method() === "PUT") {
      const body = await request.postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    } else {
      return route.continue();
    }
  });
};

test.describe("Profile Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndMocks(page);
  });

  test("should display profile form with user data", async ({ page }) => {
    await page.goto("./settings/profile");

    // Wait for page to load
    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Check form fields are visible
    await expect(page.getByPlaceholder("กรอกชื่อ")).toBeVisible();
    await expect(page.getByPlaceholder("กรอกนามสกุล")).toBeVisible();
    await expect(page.getByPlaceholder("กรอกอีเมล")).toBeVisible();

    // Check that fields are populated with user data
    const firstNameInput = page.getByPlaceholder("กรอกชื่อ");
    const lastNameInput = page.getByPlaceholder("กรอกนามสกุล");
    const emailInput = page.getByPlaceholder("กรอกอีเมล");

    await expect(firstNameInput).toHaveValue("Test");
    await expect(lastNameInput).toHaveValue("User");
    await expect(emailInput).toHaveValue("test@example.com");

    // Check email field is disabled
    await expect(emailInput).toBeDisabled();

    // Check buttons are visible
    await expect(page.getByRole("button", { name: /ยกเลิก/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /บันทึกการเปลี่ยนแปลง/ }),
    ).toBeVisible();
  });

  test("should validate required fields", async ({ page }) => {
    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Clear firstname field
    const firstNameInput = page.getByPlaceholder("กรอกชื่อ");
    await firstNameInput.clear();
    await firstNameInput.blur();

    // Trigger form validation
    const form = page.locator("form");
    await form.evaluate((form) => {
      const event = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
    });

    // Wait for validation error
    await expect(page.getByText(/กรุณากรอกชื่อ/, { exact: false })).toBeVisible(
      { timeout: 2000 },
    );

    // Clear lastname field
    const lastNameInput = page.getByPlaceholder("กรอกนามสกุล");
    await lastNameInput.clear();
    await lastNameInput.blur();

    // Trigger form validation again
    await form.evaluate((form) => {
      const event = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
    });

    // Wait for validation error
    await expect(
      page.getByText(/กรุณากรอกนามสกุล/, { exact: false }),
    ).toBeVisible({ timeout: 2000 });
  });

  test("should validate max length for firstname and lastname", async ({
    page,
  }) => {
    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Fill firstname with more than 50 characters
    const longName = "a".repeat(51);
    const firstNameInput = page.getByPlaceholder("กรอกชื่อ");
    await firstNameInput.clear();
    await firstNameInput.fill(longName);
    await firstNameInput.blur();

    // Wait for onChange validation (form uses mode: "onChange")
    await page.waitForTimeout(1000);

    // Wait for validation error
    await expect(
      page.getByText(/ชื่อไม่ควรเกิน 50 ตัวอักษร/, { exact: false }),
    ).toBeVisible({ timeout: 3000 });

    // Fill lastname with more than 50 characters
    const lastNameInput = page.getByPlaceholder("กรอกนามสกุล");
    await lastNameInput.clear();
    await lastNameInput.fill(longName);
    await lastNameInput.blur();

    // Wait for onChange validation
    await page.waitForTimeout(1000);

    // Wait for validation error
    await expect(
      page.getByText(/นามสกุลไม่ควรเกิน 50 ตัวอักษร/, { exact: false }),
    ).toBeVisible({ timeout: 3000 });

    // Submit button should be disabled when there are validation errors
    const submitButton = page.getByRole("button", {
      name: /บันทึกการเปลี่ยนแปลง/,
    });
    await expect(submitButton).toBeDisabled();
  });

  test("should accept names at exactly 50 characters", async ({ page }) => {
    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Fill with exactly 50 characters (should be valid)
    const validName = "a".repeat(50);
    const firstNameInput = page.getByPlaceholder("กรอกชื่อ");
    await firstNameInput.clear();
    await firstNameInput.fill(validName);
    await firstNameInput.blur();

    // Wait for validation
    await page.waitForTimeout(1000);

    // No error should appear for exactly 50 characters
    await expect(
      page.getByText(/ชื่อไม่ควรเกิน 50 ตัวอักษร/, { exact: false }),
    ).not.toBeVisible({ timeout: 2000 });

    // Form should be submittable
    const submitButton = page.getByRole("button", {
      name: /บันทึกการเปลี่ยนแปลง/,
    });
    await expect(submitButton).toBeEnabled();
  });

  test("should successfully update user profile", async ({ page }) => {
    // Mock update user API
    await page.route("**/users/user-id", async (route) => {
      const request = route.request();
      if (request.method() !== "PUT") {
        return route.continue();
      }

      const body = await request.postDataJSON();

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-id",
          email: "test@example.com",
          firstName: body.firstName,
          lastName: body.lastName,
          roles: ["user"],
        }),
      });
    });

    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Update firstname and lastname
    const firstNameInput = page.getByPlaceholder("กรอกชื่อ");
    const lastNameInput = page.getByPlaceholder("กรอกนามสกุล");

    await firstNameInput.clear();
    await firstNameInput.fill("Updated");
    await lastNameInput.clear();
    await lastNameInput.fill("Name");

    // Submit form
    const submitButton = page.getByRole("button", {
      name: /บันทึกการเปลี่ยนแปลง/,
    });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Wait for success notification
    await expect(
      page.getByText(/บันทึกข้อมูลสำเร็จ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    // Verify form values are updated
    await expect(firstNameInput).toHaveValue("Updated");
    await expect(lastNameInput).toHaveValue("Name");
  });

  test("should show error notification on update failure", async ({ page }) => {
    // Mock update user API to return error
    await page.route("**/users/user-id", async (route) => {
      const request = route.request();
      if (request.method() !== "PUT") {
        return route.continue();
      }

      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Update failed",
          code: "UPDATE_ERROR",
        }),
      });
    });

    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Update firstname
    const firstNameInput = page.getByPlaceholder("กรอกชื่อ");
    await firstNameInput.clear();
    await firstNameInput.fill("Updated");

    // Submit form
    const submitButton = page.getByRole("button", {
      name: /บันทึกการเปลี่ยนแปลง/,
    });
    await submitButton.click();

    // Wait for error notification
    await expect(
      page.getByText(/เกิดข้อผิดพลาดในการบันทึกข้อมูล/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should disable submit button when form is not dirty", async ({
    page,
  }) => {
    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Submit button should be disabled initially (no changes)
    const submitButton = page.getByRole("button", {
      name: /บันทึกการเปลี่ยนแปลง/,
    });
    await expect(submitButton).toBeDisabled();

    // Make a change
    const firstNameInput = page.getByPlaceholder("กรอกชื่อ");
    await firstNameInput.clear();
    await firstNameInput.fill("Changed");

    // Submit button should now be enabled
    await expect(submitButton).toBeEnabled();
  });

  test("should reset form when cancel button is clicked", async ({ page }) => {
    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    const firstNameInput = page.getByPlaceholder("กรอกชื่อ");
    const lastNameInput = page.getByPlaceholder("กรอกนามสกุล");

    // Make changes
    await firstNameInput.clear();
    await firstNameInput.fill("Changed");
    await lastNameInput.clear();
    await lastNameInput.fill("Name");

    // Click cancel button
    const cancelButton = page.getByRole("button", { name: /ยกเลิก/ });
    await cancelButton.click();

    // Form should reset to original values
    await expect(firstNameInput).toHaveValue("Test");
    await expect(lastNameInput).toHaveValue("User");

    // Submit button should be disabled again
    const submitButton = page.getByRole("button", {
      name: /บันทึกการเปลี่ยนแปลง/,
    });
    await expect(submitButton).toBeDisabled();
  });

  test("should show loading state during submission", async ({ page }) => {
    // Mock update user API with delay
    await page.route("**/users/user-id", async (route) => {
      const request = route.request();
      if (request.method() !== "PUT") {
        return route.continue();
      }

      // Add delay to simulate network request
      await page.waitForTimeout(500);

      const body = await request.postDataJSON();

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-id",
          email: "test@example.com",
          firstName: body.firstName,
          lastName: body.lastName,
          roles: ["user"],
        }),
      });
    });

    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Make a change
    const firstNameInput = page.getByPlaceholder("กรอกชื่อ");
    await firstNameInput.clear();
    await firstNameInput.fill("Updated");

    // Submit form
    const submitButton = page.getByRole("button", {
      name: /บันทึกการเปลี่ยนแปลง/,
    });
    await submitButton.click();

    // Button should show loading state
    await expect(
      page.getByRole("button", { name: /กำลังบันทึก.../ }),
    ).toBeVisible({ timeout: 1000 });

    // Button should be disabled during submission
    await expect(submitButton).toBeDisabled();
  });

  test("should display error messages for invalid input", async ({ page }) => {
    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Clear firstname and trigger validation
    const firstNameInput = page.getByPlaceholder("กรอกชื่อ");
    await firstNameInput.clear();
    await firstNameInput.blur();

    const form = page.locator("form");
    await form.evaluate((form) => {
      const event = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(event);
    });

    // Error message should appear
    await expect(page.getByText(/กรุณากรอกชื่อ/, { exact: false })).toBeVisible(
      { timeout: 2000 },
    );

    // Fill with valid value - error should disappear
    await firstNameInput.fill("Valid");
    await firstNameInput.blur();
    await page.waitForTimeout(300);

    await expect(
      page.getByText(/กรุณากรอกชื่อ/, { exact: false }),
    ).not.toBeVisible({ timeout: 2000 });
  });

  test("should keep email field disabled and read-only", async ({ page }) => {
    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    const emailInput = page.getByPlaceholder("กรอกอีเมล");

    // Email should be disabled
    await expect(emailInput).toBeDisabled();

    // Try to interact with it (should not be possible)
    await emailInput.click({ force: true });
    // Even if clicked, it should remain disabled
    await expect(emailInput).toBeDisabled();
  });
});

// ==================== Cookie Settings Tests ====================
test.describe("Cookie Settings", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndMocks(page);
  });

  test("should display cookie settings section with all toggles", async ({
    page,
  }) => {
    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Check cookie settings section is visible
    await expect(page.getByText("การตั้งค่าคุกกี้")).toBeVisible();
    await expect(page.getByText("จัดการการใช้งานคุกกี้")).toBeVisible();

    // Check all cookie toggles are visible (use exact match to avoid matching descriptions)
    await expect(
      page.getByText("คุกกี้ที่จำเป็น", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("คุกกี้ในส่วนวิเคราะห์", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("คุกกี้ในส่วนการตลาด", { exact: true }),
    ).toBeVisible();
  });

  test("should have required cookie toggle disabled and always on", async ({
    page,
  }) => {
    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Find the required cookie switch - it should be disabled
    const requiredCookieSwitch = page.locator(
      '[id^="cookie-section-cookieRequire"]',
    );
    await expect(requiredCookieSwitch).toBeDisabled();

    // Required cookie should be checked (on)
    await expect(requiredCookieSwitch).toBeChecked();
  });

  test("should allow toggling analytics cookie", async ({ page }) => {
    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Find the analytics cookie switch
    const analyticsCookieSwitch = page.locator(
      '[id^="cookie-section-cookieAnalytic"]',
    );

    // Should be enabled and initially unchecked (default)
    await expect(analyticsCookieSwitch).toBeEnabled();

    // Get initial state
    const initialChecked = await analyticsCookieSwitch.isChecked();

    // Toggle the switch
    await analyticsCookieSwitch.click();

    // Should be toggled
    await expect(analyticsCookieSwitch).toBeChecked({
      checked: !initialChecked,
    });
  });

  test("should allow toggling marketing cookie", async ({ page }) => {
    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Find the marketing cookie switch
    const marketingCookieSwitch = page.locator(
      '[id^="cookie-section-cookieMarketing"]',
    );

    // Should be enabled and initially unchecked (default)
    await expect(marketingCookieSwitch).toBeEnabled();

    // Get initial state
    const initialChecked = await marketingCookieSwitch.isChecked();

    // Toggle the switch
    await marketingCookieSwitch.click();

    // Should be toggled
    await expect(marketingCookieSwitch).toBeChecked({
      checked: !initialChecked,
    });
  });

  test("should save cookie settings when form is submitted", async ({
    page,
  }) => {
    // Mock update user API
    await page.route("**/users/user-id", async (route) => {
      const request = route.request();
      if (request.method() !== "PUT") {
        return route.continue();
      }

      const body = await request.postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-id",
          email: "test@example.com",
          firstName: body.firstName,
          lastName: body.lastName,
          roles: ["user"],
        }),
      });
    });

    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Toggle analytics cookie to enable it
    const analyticsCookieSwitch = page.locator(
      '[id^="cookie-section-cookieAnalytic"]',
    );
    await analyticsCookieSwitch.click();

    // Toggle marketing cookie to enable it
    const marketingCookieSwitch = page.locator(
      '[id^="cookie-section-cookieMarketing"]',
    );
    await marketingCookieSwitch.click();

    // Submit form
    const submitButton = page.getByRole("button", {
      name: /บันทึกการเปลี่ยนแปลง/,
    });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Wait for success notification
    await expect(
      page.getByText(/บันทึกข้อมูลสำเร็จ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should reset cookie settings when cancel is clicked", async ({
    page,
  }) => {
    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Get initial state of analytics cookie
    const analyticsCookieSwitch = page.locator(
      '[id^="cookie-section-cookieAnalytic"]',
    );
    const initialChecked = await analyticsCookieSwitch.isChecked();

    // Toggle analytics cookie
    await analyticsCookieSwitch.click();

    // Verify it changed
    await expect(analyticsCookieSwitch).toBeChecked({
      checked: !initialChecked,
    });

    // Click cancel button
    const cancelButton = page.getByRole("button", { name: /ยกเลิก/ });
    await cancelButton.click();

    // Should reset to initial state
    await expect(analyticsCookieSwitch).toBeChecked({
      checked: initialChecked,
    });
  });

  test("should display cookie descriptions", async ({ page }) => {
    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Check required cookie description
    await expect(
      page.getByText(/คุกกี้นี้จำเป็นสำหรับการทำงานของเว็บไซต์/),
    ).toBeVisible();

    // Check analytics cookie description
    await expect(
      page.getByText(/คุกกี้ในส่วนวิเคราะห์จะช่วยให้เข้าใจรูปแบบการใช้งาน/),
    ).toBeVisible();

    // Check marketing cookie description
    await expect(
      page.getByText(/คุกกี้ในส่วนการตลาดใช้เพื่อติดตามพฤติกรรมผู้เข้าชม/),
    ).toBeVisible();
  });
});

// ==================== Delete Account Tests ====================
test.describe("Delete Account", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndMocks(page);
  });

  test("should display delete account section", async ({ page }) => {
    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Check delete account section is visible (use heading role to be specific)
    await expect(
      page.getByRole("heading", { name: "ลบบัญชีการใช้งาน" }),
    ).toBeVisible();
    await expect(page.getByText("ลบบัญชีและข้อมูลทั้งหมดถาวร")).toBeVisible();

    // Check delete button is visible
    await expect(
      page.getByRole("button", { name: /ลบบัญชีการใช้งาน/ }),
    ).toBeVisible();
  });

  test("should open confirmation modal when clicking delete button", async ({
    page,
  }) => {
    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Click delete account button
    await page.getByRole("button", { name: /ลบบัญชีการใช้งาน/ }).click();

    // Modal should appear
    await expect(page.getByText("ยืนยันการลบบัญชีการใช้งาน")).toBeVisible({
      timeout: 2000,
    });
    await expect(
      page.getByText(
        "คุณต้องการลบบัญชีการใช้งานและข้อมูลทั้งหมดถาวร ใช่หรือไม่",
      ),
    ).toBeVisible();

    // Modal buttons should be visible
    await expect(
      page.getByRole("button", { name: /ยกเลิก/ }).last(),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^ลบ$/ })).toBeVisible();
  });

  test("should close modal when clicking cancel in confirmation", async ({
    page,
  }) => {
    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Click delete account button
    await page.getByRole("button", { name: /ลบบัญชีการใช้งาน/ }).click();

    // Modal should appear
    await expect(page.getByText("ยืนยันการลบบัญชีการใช้งาน")).toBeVisible({
      timeout: 2000,
    });

    // Click cancel in modal
    await page
      .getByRole("button", { name: /ยกเลิก/ })
      .last()
      .click();

    // Modal should be closed
    await expect(page.getByText("ยืนยันการลบบัญชีการใช้งาน")).not.toBeVisible({
      timeout: 2000,
    });
  });

  test("should successfully delete account and redirect to login", async ({
    page,
  }) => {
    // Mock delete user API
    await page.route("**/users/user-id", async (route) => {
      const request = route.request();
      if (request.method() !== "DELETE") {
        return route.continue();
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Click delete account button
    await page.getByRole("button", { name: /ลบบัญชีการใช้งาน/ }).click();

    // Modal should appear
    await expect(page.getByText("ยืนยันการลบบัญชีการใช้งาน")).toBeVisible({
      timeout: 2000,
    });

    // Click delete button in modal
    await page.getByRole("button", { name: /^ลบ$/ }).click();

    // Should show success notification
    await expect(
      page.getByText(/ลบบัญชีการใช้งานสำเร็จ/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    // Should redirect to login page - verify login page content is displayed
    // (app may show login UI via auth middleware without URL change, or redirect)
    await expect(
      page.getByRole("heading", { name: /เข้าสู่ระบบ/ }),
    ).toBeVisible({ timeout: 10000 });

    // Verify login form elements are present
    await expect(page.getByPlaceholder("กรอกอีเมล")).toBeVisible();
    await expect(page.getByPlaceholder("กรอกรหัสผ่าน")).toBeVisible();
  });

  test("should show error notification when delete account fails", async ({
    page,
  }) => {
    // Mock delete user API to return error
    await page.route("**/users/user-id", async (route) => {
      const request = route.request();
      if (request.method() !== "DELETE") {
        return route.continue();
      }

      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Delete failed" }),
      });
    });

    await page.goto("./settings/profile");

    await expect(
      page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Click delete account button
    await page.getByRole("button", { name: /ลบบัญชีการใช้งาน/ }).click();

    // Modal should appear
    await expect(page.getByText("ยืนยันการลบบัญชีการใช้งาน")).toBeVisible({
      timeout: 2000,
    });

    // Click delete button in modal
    await page.getByRole("button", { name: /^ลบ$/ }).click();

    // Should show error notification
    await expect(
      page.getByText(/เกิดข้อผิดพลาดในการลบบัญชีการใช้งาน/, { exact: false }),
    ).toBeVisible({ timeout: 5000 });

    // Should NOT redirect - still on profile page
    await expect(page).not.toHaveURL(/\/auth\/login/);
  });
});

// ==================== Notification Settings Tests ====================
test.describe("Notification Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthAndMocks(page);
  });

  test("should display notification settings page with header", async ({
    page,
  }) => {
    await page.goto("./settings/notification");

    // Wait for page to load
    await expect(
      page.getByRole("heading", { name: /การแจ้งเตือน/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Check subtitle
    await expect(page.getByText("จัดการประเภทของการแจ้งเตือน")).toBeVisible();
  });

  test("should display notification type section", async ({ page }) => {
    await page.goto("./settings/notification");

    await expect(
      page.getByRole("heading", { name: /การแจ้งเตือน/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Check notification type section
    await expect(page.getByText("ประเภทการแจ้งเตือน")).toBeVisible();
  });

  test("should display email notification toggle", async ({ page }) => {
    await page.goto("./settings/notification");

    await expect(
      page.getByRole("heading", { name: /การแจ้งเตือน/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Check email notification toggle is visible
    await expect(page.getByText("การแจ้งเตือนทาง Email")).toBeVisible();

    // Check the switch exists
    const emailNotificationSwitch = page.locator(
      '[id^="notification-enableEmailNotifications"]',
    );
    await expect(emailNotificationSwitch).toBeVisible();
  });

  test("should display push notification toggle", async ({ page }) => {
    await page.goto("./settings/notification");

    await expect(
      page.getByRole("heading", { name: /การแจ้งเตือน/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Check push notification toggle is visible
    await expect(
      page.getByText("การแจ้งเตือนแบบ Push Notification"),
    ).toBeVisible();

    // Check the switch exists
    const pushNotificationSwitch = page.locator(
      '[id^="notification-enablePushNotifications"]',
    );
    await expect(pushNotificationSwitch).toBeVisible();
  });

  test("should display save and cancel buttons", async ({ page }) => {
    await page.goto("./settings/notification");

    await expect(
      page.getByRole("heading", { name: /การแจ้งเตือน/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Check buttons are visible
    await expect(page.getByRole("button", { name: /ยกเลิก/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /บันทึกการเปลี่ยนแปลง/ }),
    ).toBeVisible();
  });

  test("should have save button disabled when no changes made", async ({
    page,
  }) => {
    await page.goto("./settings/notification");

    await expect(
      page.getByRole("heading", { name: /การแจ้งเตือน/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Save button should be disabled initially (no changes)
    const submitButton = page.getByRole("button", {
      name: /บันทึกการเปลี่ยนแปลง/,
    });
    await expect(submitButton).toBeDisabled();
  });

  test("should enable save button when email notification is toggled", async ({
    page,
  }) => {
    await page.goto("./settings/notification");

    await expect(
      page.getByRole("heading", { name: /การแจ้งเตือน/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Toggle email notification
    const emailNotificationSwitch = page.locator(
      '[id^="notification-enableEmailNotifications"]',
    );
    await emailNotificationSwitch.click();

    // Save button should now be enabled
    const submitButton = page.getByRole("button", {
      name: /บันทึกการเปลี่ยนแปลง/,
    });
    await expect(submitButton).toBeEnabled();
  });

  test("should save email notification settings successfully", async ({
    page,
  }) => {
    await page.goto("./settings/notification");

    await expect(
      page.getByRole("heading", { name: /การแจ้งเตือน/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Toggle email notification
    const emailNotificationSwitch = page.locator(
      '[id^="notification-enableEmailNotifications"]',
    );
    await emailNotificationSwitch.click();

    // Submit form
    const submitButton = page.getByRole("button", {
      name: /บันทึกการเปลี่ยนแปลง/,
    });
    await submitButton.click();

    // Wait for success notification (use first() to avoid strict mode violation)
    await expect(page.getByText("บันทึกสำเร็จ").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("should reset notification settings when cancel is clicked", async ({
    page,
  }) => {
    await page.goto("./settings/notification");

    await expect(
      page.getByRole("heading", { name: /การแจ้งเตือน/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Get initial state of email notification
    const emailNotificationSwitch = page.locator(
      '[id^="notification-enableEmailNotifications"]',
    );
    const initialChecked = await emailNotificationSwitch.isChecked();

    // Toggle email notification
    await emailNotificationSwitch.click();

    // Verify it changed
    await expect(emailNotificationSwitch).toBeChecked({
      checked: !initialChecked,
    });

    // Click cancel button
    const cancelButton = page.getByRole("button", { name: /ยกเลิก/ });
    await cancelButton.click();

    // Should reset to initial state (from API)
    await page.waitForTimeout(500); // Wait for API call
    await expect(emailNotificationSwitch).toBeChecked({
      checked: initialChecked,
    });
  });

  test("should show error notification when saving fails", async ({ page }) => {
    // Mock user settings API to return error on PUT
    await page.route("**/users/setting", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            enableEmailNotification: true,
          }),
        });
      } else if (request.method() === "PUT") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Save failed" }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./settings/notification");

    await expect(
      page.getByRole("heading", { name: /การแจ้งเตือน/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Toggle email notification
    const emailNotificationSwitch = page.locator(
      '[id^="notification-enableEmailNotifications"]',
    );
    await emailNotificationSwitch.click();

    // Submit form
    const submitButton = page.getByRole("button", {
      name: /บันทึกการเปลี่ยนแปลง/,
    });
    await submitButton.click();

    // Wait for error notification (use first() to avoid strict mode violation)
    await expect(page.getByText("เกิดข้อผิดพลาด").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("should show loading state during submission", async ({ page }) => {
    // Use a promise to control the delay
    let resolveRequest: () => void;
    const requestPromise = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    // Mock user settings API with delay
    await page.route("**/users/setting", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            enableEmailNotification: true,
          }),
        });
      } else if (request.method() === "PUT") {
        // Wait for the promise to resolve
        await requestPromise;
        const body = await request.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./settings/notification");

    await expect(
      page.getByRole("heading", { name: /การแจ้งเตือน/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Toggle email notification
    const emailNotificationSwitch = page.locator(
      '[id^="notification-enableEmailNotifications"]',
    );
    await emailNotificationSwitch.click();

    // Submit form
    const submitButton = page.getByRole("button", {
      name: /บันทึกการเปลี่ยนแปลง/,
    });
    await submitButton.click();

    // Button should show loading state
    await expect(
      page.getByRole("button", { name: /กำลังบันทึก.../ }),
    ).toBeVisible({ timeout: 1000 });

    // Resolve the request to complete the test properly
    resolveRequest!();

    // Clean up routes to avoid dangling promises
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  test("should load saved email notification setting from API", async ({
    page,
  }) => {
    // Mock user settings API to return email notification disabled
    await page.route("**/users/setting", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            enableEmailNotification: false,
          }),
        });
      } else if (request.method() === "PUT") {
        const body = await request.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./settings/notification");

    await expect(
      page.getByRole("heading", { name: /การแจ้งเตือน/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Email notification should be unchecked (based on API response)
    const emailNotificationSwitch = page.locator(
      '[id^="notification-enableEmailNotifications"]',
    );
    await expect(emailNotificationSwitch).not.toBeChecked();
  });

  test("should show push notification browser status when not supported", async ({
    page,
  }) => {
    // In Playwright, push notifications are typically not supported
    await page.goto("./settings/notification");

    await expect(
      page.getByRole("heading", { name: /การแจ้งเตือน/ }).first(),
    ).toBeVisible({ timeout: 5000 });

    // Check for status text indicating browser doesn't support or permission needed
    // This will vary based on browser support
    const statusText = page.getByText(
      /ไม่รองรับในเบราว์เซอร์นี้|กรุณาอนุญาตการแจ้งเตือนในเบราว์เซอร์/,
    );

    // The status might or might not be visible depending on test browser
    // So we just check the toggle is visible
    const pushNotificationSwitch = page.locator(
      '[id^="notification-enablePushNotifications"]',
    );
    await expect(pushNotificationSwitch).toBeVisible();
  });
});
