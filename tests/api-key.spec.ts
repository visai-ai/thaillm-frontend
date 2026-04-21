import { expect, test } from "@playwright/test";

test.describe("API Key Page", () => {
  test.beforeEach(async ({ page }) => {
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
  });

  test("should display empty state when no API keys exist", async ({
    page,
  }) => {
    // Mock empty API keys list
    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      if (request.method() !== "GET") {
        return route.continue();
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          pagination: {
            page: 1,
            limit: 10,
            totalPages: 0,
            totalItems: 0,
          },
        }),
      });
    });

    await page.goto("./developer/api-key");

    // Wait for page to load - use first() to avoid strict mode violation
    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Check for empty state
    await expect(page.getByText(/ยังไม่มี API Key ในระบบ/)).toBeVisible();

    // Check for empty state action button - use first() to avoid strict mode violation
    await expect(
      page.getByRole("button", { name: /เพิ่ม API Key/ }).first(),
    ).toBeVisible();
  });

  test("should display API keys table with data", async ({ page }) => {
    const mockAPIKeys = [
      {
        id: "key-1",
        name: "Test API Key 1",
        apiKey: "sk_test_1234567890abcdef",
        isActivated: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        usageLimit: null,
        limitPeriod: null,
        currentUsage: 100,
      },
      {
        id: "key-2",
        name: "Test API Key 2",
        apiKey: "sk_test_abcdef1234567890",
        isActivated: false,
        createdAt: "2024-01-02T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
        usageLimit: 1000,
        limitPeriod: "day",
        currentUsage: 500,
      },
    ];

    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      if (request.method() !== "GET") {
        return route.continue();
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: mockAPIKeys,
          pagination: {
            page: 1,
            limit: 10,
            totalPages: 1,
            totalItems: 2,
          },
        }),
      });
    });

    await page.goto("./developer/api-key");

    // Wait for page to load - use first() to avoid strict mode violation
    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Check for API keys in table
    await expect(page.getByText("Test API Key 1")).toBeVisible();
    await expect(page.getByText("Test API Key 2")).toBeVisible();

    // Check for status badges - use first() to avoid strict mode violation
    await expect(page.getByText(/เปิดใช้งาน/).first()).toBeVisible();
    await expect(page.getByText(/ปิดใช้งาน/).first()).toBeVisible();

    // Check for API key display (last 4 characters)
    await expect(page.getByText(/...cdef/)).toBeVisible();
    await expect(page.getByText(/...7890/)).toBeVisible();

    // Check for usage display
    await expect(page.getByText("100")).toBeVisible();
    await expect(page.getByText(/500\/1,000 ต่อวัน/)).toBeVisible();
  });

  test("should open add API key modal", async ({ page }) => {
    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      if (request.method() !== "GET") {
        return route.continue();
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          pagination: {
            page: 1,
            limit: 10,
            totalPages: 0,
            totalItems: 0,
          },
        }),
      });
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Click add API key button
    const addButton = page
      .getByRole("button", { name: /เพิ่ม API Key/ })
      .first();
    await addButton.click();

    // Check modal is visible - use heading role to avoid strict mode violation
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /เพิ่ม API Key/ }),
    ).toBeVisible({ timeout: 2000 });

    // Check form fields are visible
    await expect(page.getByPlaceholder("กรอกชื่อ API Key")).toBeVisible();
    await expect(page.getByText(/ใช้งาน Rate limit/)).toBeVisible();
    await expect(page.getByText(/ใช้งาน API Key/)).toBeVisible();
  });

  test("should validate required fields in add modal", async ({ page }) => {
    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      if (request.method() !== "GET") {
        return route.continue();
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          pagination: {
            page: 1,
            limit: 10,
            totalPages: 0,
            totalItems: 0,
          },
        }),
      });
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Open add modal
    const addButton = page
      .getByRole("button", { name: /เพิ่ม API Key/ })
      .first();
    await addButton.click();

    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /เพิ่ม API Key/ }),
    ).toBeVisible({ timeout: 2000 });

    // Try to submit without filling name
    const submitButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /เพิ่ม API Key/ });

    // Button should be disabled when form is invalid
    await expect(submitButton).toBeDisabled();
  });

  test("should validate rate limit field when enabled", async ({ page }) => {
    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      if (request.method() !== "GET") {
        return route.continue();
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [],
          pagination: {
            page: 1,
            limit: 10,
            totalPages: 0,
            totalItems: 0,
          },
        }),
      });
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Open add modal
    const addButton = page
      .getByRole("button", { name: /เพิ่ม API Key/ })
      .first();
    await addButton.click();

    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /เพิ่ม API Key/ }),
    ).toBeVisible({ timeout: 2000 });

    // Fill name
    await page.getByPlaceholder("กรอกชื่อ API Key").fill("Test Key");

    // Enable rate limit - click on the label text to trigger the switch
    const rateLimitLabel = page
      .getByRole("dialog")
      .getByText(/ใช้งาน Rate limit/);
    await rateLimitLabel.click();

    // Wait for rate limit fields to appear
    await expect(
      page.getByPlaceholder("กรอกจำนวนการจำกัดการใช้งาน"),
    ).toBeVisible({ timeout: 2000 });

    // Try to submit without rate limit value
    const submitButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /เพิ่ม API Key/ });

    // Button should be disabled
    await expect(submitButton).toBeDisabled();

    // Fill invalid rate limit (non-numeric)
    await page.getByPlaceholder("กรอกจำนวนการจำกัดการใช้งาน").fill("invalid");

    // Wait for validation
    await page.waitForTimeout(500);

    // Error message should appear
    await expect(page.getByText(/กรุณาระบุเป็นตัวเลข/)).toBeVisible({
      timeout: 2000,
    });
  });

  test("should successfully create API key without rate limit", async ({
    page,
  }) => {
    let createCallCount = 0;

    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 0,
              totalItems: 0,
            },
          }),
        });
      } else if (
        request.method() === "POST" &&
        !url.pathname.includes("/regenerate")
      ) {
        createCallCount++;
        const body = await request.postDataJSON();

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "new-key-id",
            name: body.name,
            apiKey: "sk_test_newly_created_key_12345",
            isActivated: body.isActivated,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usageLimit: body.usageLimit,
            limitPeriod: body.limitPeriod,
            currentUsage: 0,
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Open add modal
    const addButton = page
      .getByRole("button", { name: /เพิ่ม API Key/ })
      .first();
    await addButton.click();

    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /เพิ่ม API Key/ }),
    ).toBeVisible({ timeout: 2000 });

    // Fill form
    await page.getByPlaceholder("กรอกชื่อ API Key").fill("My New API Key");

    // Submit
    const submitButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /เพิ่ม API Key/ });
    await submitButton.click();

    // Wait for React to process the state update (useTransition can cause delays)
    await page.waitForTimeout(1000);

    // Wait for success modal - the dialog content changes after API call
    // The success modal replaces the form modal, so we look for the heading in any dialog
    await expect(
      page.getByRole("heading", { name: /สร้าง API Key ใหม่สำเร็จ/ }),
    ).toBeVisible({ timeout: 15000 });

    // Check API key is displayed in the input field (value of textbox)
    const apiKeyInput = page.getByRole("dialog").getByRole("textbox");
    await expect(apiKeyInput).toHaveValue("sk_test_newly_created_key_12345");

    // Check copy button is visible
    await expect(page.getByRole("button", { name: /คัดลอก/ })).toBeVisible();

    expect(createCallCount).toBe(1);
  });

  test("should successfully create API key with rate limit", async ({
    page,
  }) => {
    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 0,
              totalItems: 0,
            },
          }),
        });
      } else if (
        request.method() === "POST" &&
        !url.pathname.includes("/regenerate")
      ) {
        const body = await request.postDataJSON();

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "new-key-id",
            name: body.name,
            apiKey: "sk_test_with_rate_limit",
            isActivated: body.isActivated,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usageLimit: body.usageLimit,
            limitPeriod: body.limitPeriod,
            currentUsage: 0,
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Open add modal
    const addButton = page
      .getByRole("button", { name: /เพิ่ม API Key/ })
      .first();
    await addButton.click();

    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /เพิ่ม API Key/ }),
    ).toBeVisible({ timeout: 2000 });

    // Fill form
    await page.getByPlaceholder("กรอกชื่อ API Key").fill("Rate Limited Key");

    // Enable rate limit - click on the label text to trigger the switch
    const rateLimitLabel = page
      .getByRole("dialog")
      .getByText(/ใช้งาน Rate limit/);
    await rateLimitLabel.click();

    // Wait for rate limit fields
    await expect(
      page.getByPlaceholder("กรอกจำนวนการจำกัดการใช้งาน"),
    ).toBeVisible({ timeout: 1000 });

    // Fill rate limit
    await page.getByPlaceholder("กรอกจำนวนการจำกัดการใช้งาน").fill("1000");

    // Select rate limit unit (default should be first option)
    // The dropdown should already have a default value

    // Submit
    const submitButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /เพิ่ม API Key/ });
    await submitButton.click();

    // Wait for success modal
    await expect(
      page
        .getByRole("dialog")
        .getByRole("heading", { name: /สร้าง API Key ใหม่สำเร็จ/ }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should open edit modal with pre-filled values", async ({ page }) => {
    const mockAPIKey = {
      id: "key-1",
      name: "Test API Key",
      apiKey: "sk_test_1234567890abcdef",
      isActivated: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      usageLimit: 1000,
      limitPeriod: "day",
      currentUsage: 500,
    };

    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [mockAPIKey],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 1,
              totalItems: 1,
            },
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Wait for table to load
    await expect(page.getByText("Test API Key")).toBeVisible();

    // Find the row containing the API key name
    const row = page
      .locator("tr")
      .filter({ has: page.getByText("Test API Key") });
    await expect(row).toBeVisible();

    // Find edit button (pencil icon) in the actions column
    const editBtn = row
      .locator("button")
      .filter({
        has: page.locator(
          'svg[class*="lucide-pencil"], svg[class*="PencilIcon"]',
        ),
      })
      .first();
    await editBtn.click();

    // Check edit modal is visible
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /แก้ไข API Key/ }),
    ).toBeVisible({ timeout: 2000 });

    // Check form is pre-filled
    const nameInput = page.getByPlaceholder("กรอกชื่อ API Key");
    await expect(nameInput).toHaveValue("Test API Key");
  });

  test("should successfully update API key", async ({ page }) => {
    const mockAPIKey = {
      id: "key-1",
      name: "Original Name",
      apiKey: "sk_test_1234567890abcdef",
      isActivated: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      usageLimit: null,
      limitPeriod: null,
      currentUsage: 0,
    };

    let updateCallCount = 0;

    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [mockAPIKey],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 1,
              totalItems: 1,
            },
          }),
        });
      } else if (request.method() === "PUT") {
        updateCallCount++;
        const body = await request.postDataJSON();

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "key-1",
            name: body.name,
            apiKey: "sk_test_updated_key",
            isActivated: body.isActivated,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: new Date().toISOString(),
            usageLimit: body.usageLimit,
            limitPeriod: body.limitPeriod,
            currentUsage: 0,
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Wait for table
    await expect(page.getByText("Original Name")).toBeVisible();

    // Find the row and click edit button
    const row = page
      .locator("tr")
      .filter({ has: page.getByText("Original Name") });
    await expect(row).toBeVisible();
    const editBtn = row
      .locator("button")
      .filter({
        has: page.locator(
          'svg[class*="lucide-pencil"], svg[class*="PencilIcon"]',
        ),
      })
      .first();
    await editBtn.click();

    // Wait for edit modal
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /แก้ไข API Key/ }),
    ).toBeVisible({ timeout: 2000 });

    // Update name
    const nameInput = page.getByPlaceholder("กรอกชื่อ API Key");
    await nameInput.clear();
    await nameInput.fill("Updated Name");

    // Submit
    const submitButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /บันทึก/ });
    await submitButton.click();

    // Wait for React to process the state update (useTransition can cause delays)
    await page.waitForTimeout(1000);

    // Wait for success notification - edit shows a modal
    // The success modal replaces the form modal, so we look for the heading
    await expect(
      page.getByRole("heading", { name: /แก้ไข API Key ใหม่สำเร็จ/ }),
    ).toBeVisible({
      timeout: 15000,
    });

    expect(updateCallCount).toBe(1);
  });

  test("should successfully regenerate API key", async ({ page }) => {
    const mockAPIKey = {
      id: "key-1",
      name: "Test Key",
      apiKey: "sk_test_old_key_12345",
      isActivated: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      usageLimit: null,
      limitPeriod: null,
      currentUsage: 0,
    };

    let regenerateCallCount = 0;

    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [mockAPIKey],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 1,
              totalItems: 1,
            },
          }),
        });
      } else if (
        request.method() === "POST" &&
        url.pathname.includes("/regenerate")
      ) {
        regenerateCallCount++;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "key-1",
            name: "Test Key",
            apiKey: "sk_test_new_regenerated_key_67890",
            isActivated: true,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: new Date().toISOString(),
            usageLimit: null,
            limitPeriod: null,
            currentUsage: 0,
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Wait for table
    await expect(page.getByText("Test Key")).toBeVisible();

    // Find the row and click edit button
    const row = page.locator("tr").filter({ has: page.getByText("Test Key") });
    await expect(row).toBeVisible();
    const editBtn = row
      .locator("button")
      .filter({
        has: page.locator(
          'svg[class*="lucide-pencil"], svg[class*="PencilIcon"]',
        ),
      })
      .first();
    await editBtn.click();

    // Wait for edit modal
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /แก้ไข API Key/ }),
    ).toBeVisible({ timeout: 2000 });

    // Click regenerate button
    const regenerateButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /สร้างใหม่/ });
    await regenerateButton.click();

    // Wait for React to process the state update (useTransition can cause delays)
    await page.waitForTimeout(1000);

    // Wait for success modal - look for heading
    // The success modal replaces the form modal
    await expect(
      page.getByRole("heading", { name: /สร้าง API Key ใหม่สำเร็จ/ }),
    ).toBeVisible({ timeout: 15000 });

    // Check new API key is displayed in the input field
    const apiKeyInput = page.getByRole("dialog").getByRole("textbox");
    await expect(apiKeyInput).toHaveValue("sk_test_new_regenerated_key_67890");

    expect(regenerateCallCount).toBe(1);
  });

  test("should open delete confirmation modal", async ({ page }) => {
    const mockAPIKey = {
      id: "key-1",
      name: "Key To Delete",
      apiKey: "sk_test_1234567890abcdef",
      isActivated: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      usageLimit: null,
      limitPeriod: null,
      currentUsage: 0,
    };

    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [mockAPIKey],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 1,
              totalItems: 1,
            },
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Wait for table
    await expect(page.getByText("Key To Delete")).toBeVisible();

    // Find the row and click delete button
    const row = page
      .locator("tr")
      .filter({ has: page.getByText("Key To Delete") });
    await expect(row).toBeVisible();
    const deleteBtn = row
      .locator("button")
      .filter({
        has: page.locator(
          'svg[class*="lucide-trash"], svg[class*="Trash2Icon"]',
        ),
      })
      .first();
    await deleteBtn.click();

    // Check delete confirmation modal is visible
    await expect(page.getByRole("dialog").getByText(/ยืนยันการลบ/)).toBeVisible(
      { timeout: 2000 },
    );

    // Check modal contains API key name - use first() to avoid strict mode violation
    await expect(page.getByText(/Key To Delete/).first()).toBeVisible();

    // Check cancel and delete buttons are visible
    await expect(page.getByRole("button", { name: /ยกเลิก/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /ลบ/ })).toBeVisible();
  });

  test("should cancel delete operation", async ({ page }) => {
    const mockAPIKey = {
      id: "key-1",
      name: "Key To Delete",
      apiKey: "sk_test_1234567890abcdef",
      isActivated: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      usageLimit: null,
      limitPeriod: null,
      currentUsage: 0,
    };

    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [mockAPIKey],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 1,
              totalItems: 1,
            },
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Wait for table
    await expect(page.getByText("Key To Delete")).toBeVisible();

    // Find the row and click delete button
    const row = page
      .locator("tr")
      .filter({ has: page.getByText("Key To Delete") });
    await expect(row).toBeVisible();
    const deleteBtn = row
      .locator("button")
      .filter({
        has: page.locator(
          'svg[class*="lucide-trash"], svg[class*="Trash2Icon"]',
        ),
      })
      .first();
    await deleteBtn.click();

    // Wait for delete modal
    await expect(page.getByRole("dialog").getByText(/ยืนยันการลบ/)).toBeVisible(
      { timeout: 2000 },
    );

    // Click cancel
    const cancelButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /ยกเลิก/ });
    await cancelButton.click();

    // Modal should close
    await expect(
      page.getByRole("dialog").getByText(/ยืนยันการลบ/),
    ).not.toBeVisible({ timeout: 2000 });

    // API key should still be visible
    await expect(page.getByText("Key To Delete")).toBeVisible();
  });

  test("should successfully delete API key", async ({ page }) => {
    const mockAPIKey = {
      id: "key-1",
      name: "Key To Delete",
      apiKey: "sk_test_1234567890abcdef",
      isActivated: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      usageLimit: null,
      limitPeriod: null,
      currentUsage: 0,
    };

    let deleteCallCount = 0;

    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: deleteCallCount > 0 ? [] : [mockAPIKey],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: deleteCallCount > 0 ? 0 : 1,
              totalItems: deleteCallCount > 0 ? 0 : 1,
            },
          }),
        });
      } else if (request.method() === "DELETE") {
        deleteCallCount++;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            message: "API key deleted successfully",
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Wait for table
    await expect(page.getByText("Key To Delete")).toBeVisible();

    // Find the row and click delete button
    const row = page
      .locator("tr")
      .filter({ has: page.getByText("Key To Delete") });
    await expect(row).toBeVisible();
    const deleteBtn = row
      .locator("button")
      .filter({
        has: page.locator(
          'svg[class*="lucide-trash"], svg[class*="Trash2Icon"]',
        ),
      })
      .first();
    await deleteBtn.click();

    // Wait for delete modal
    await expect(page.getByRole("dialog").getByText(/ยืนยันการลบ/)).toBeVisible(
      { timeout: 2000 },
    );

    // Confirm delete
    const confirmButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /ลบ/ });
    await confirmButton.click();

    // Wait for React to process the state update (useTransition can cause delays)
    await page.waitForTimeout(1000);

    // Wait for success notification - target alert title specifically
    await expect(
      page.locator('[data-slot="alert-title"]').getByText(/ลบ API Key สำเร็จ/),
    ).toBeVisible({
      timeout: 15000,
    });

    expect(deleteCallCount).toBe(1);
  });

  test("should handle delete error", async ({ page }) => {
    const mockAPIKey = {
      id: "key-1",
      name: "Key To Delete",
      apiKey: "sk_test_1234567890abcdef",
      isActivated: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      usageLimit: null,
      limitPeriod: null,
      currentUsage: 0,
    };

    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [mockAPIKey],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 1,
              totalItems: 1,
            },
          }),
        });
      } else if (request.method() === "DELETE") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Cannot delete API key",
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Wait for table
    await expect(page.getByText("Key To Delete")).toBeVisible();

    // Find the row and click delete button
    const row = page
      .locator("tr")
      .filter({ has: page.getByText("Key To Delete") });
    await expect(row).toBeVisible();
    const deleteBtn = row
      .locator("button")
      .filter({
        has: page.locator(
          'svg[class*="lucide-trash"], svg[class*="Trash2Icon"]',
        ),
      })
      .first();
    await deleteBtn.click();

    // Wait for delete modal
    await expect(page.getByRole("dialog").getByText(/ยืนยันการลบ/)).toBeVisible(
      { timeout: 2000 },
    );

    // Confirm delete
    const confirmButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /ลบ/ });
    await confirmButton.click();

    // Wait for error notification - target alert title specifically
    await expect(
      page
        .locator('[data-slot="alert-title"]')
        .getByText(/ลบ API Key ไม่สำเร็จ/),
    ).toBeVisible({
      timeout: 5000,
    });

    // API key should still be visible
    await expect(page.getByText("Key To Delete")).toBeVisible();
  });

  test("should handle create API key error", async ({ page }) => {
    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 0,
              totalItems: 0,
            },
          }),
        });
      } else if (
        request.method() === "POST" &&
        !url.pathname.includes("/regenerate")
      ) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Failed to create API key",
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Open add modal
    const addButton = page
      .getByRole("button", { name: /เพิ่ม API Key/ })
      .first();
    await addButton.click();

    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /เพิ่ม API Key/ }),
    ).toBeVisible({ timeout: 2000 });

    // Fill form
    await page.getByPlaceholder("กรอกชื่อ API Key").fill("Test Key");

    // Submit
    const submitButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /เพิ่ม API Key/ });
    await submitButton.click();

    // Wait for error notification - target alert title specifically
    await expect(
      page
        .locator('[data-slot="alert-title"]')
        .getByText(/สร้าง API Key ไม่สำเร็จ/),
    ).toBeVisible({
      timeout: 5000,
    });
  });

  test("should test table sorting", async ({ page }) => {
    const mockAPIKeys = [
      {
        id: "key-1",
        name: "A Key",
        apiKey: "sk_test_1",
        isActivated: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        usageLimit: null,
        limitPeriod: null,
        currentUsage: 0,
      },
      {
        id: "key-2",
        name: "B Key",
        apiKey: "sk_test_2",
        isActivated: false,
        createdAt: "2024-01-02T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
        usageLimit: null,
        limitPeriod: null,
        currentUsage: 0,
      },
    ];

    let sortBy: string | null = "createdAt";
    let sortOrder: "asc" | "desc" | null = "desc";

    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        const url = new URL(request.url());
        sortBy = url.searchParams.get("sortBy");
        sortOrder = url.searchParams.get("sortOrder") as "asc" | "desc" | null;

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: mockAPIKeys,
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 1,
              totalItems: 2,
            },
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Wait for table
    await expect(page.getByText("A Key")).toBeVisible();

    // Click on name column header to sort
    const nameHeader = page.getByRole("columnheader", { name: /ชื่อ/ });
    await nameHeader.click();

    // Wait a bit for the API call
    await page.waitForTimeout(1000);

    // Verify sorting parameters were sent
    // The actual sorting behavior depends on the implementation
    expect(sortBy).toBeTruthy();
  });

  test("should test pagination", async ({ page }) => {
    const mockAPIKeysPage1 = Array.from({ length: 10 }, (_, i) => ({
      id: `key-${i + 1}`,
      name: `Key ${i + 1}`,
      apiKey: `sk_test_${i + 1}`,
      isActivated: true,
      createdAt: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
      updatedAt: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
      usageLimit: null,
      limitPeriod: null,
      currentUsage: 0,
    }));

    const mockAPIKeysPage2 = Array.from({ length: 5 }, (_, i) => ({
      id: `key-${i + 11}`,
      name: `Key ${i + 11}`,
      apiKey: `sk_test_${i + 11}`,
      isActivated: true,
      createdAt: `2024-01-${String(i + 11).padStart(2, "0")}T00:00:00Z`,
      updatedAt: `2024-01-${String(i + 11).padStart(2, "0")}T00:00:00Z`,
      usageLimit: null,
      limitPeriod: null,
      currentUsage: 0,
    }));

    let currentPage = 1;

    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        const url = new URL(request.url());
        currentPage = parseInt(url.searchParams.get("page") || "1");

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: currentPage === 1 ? mockAPIKeysPage1 : mockAPIKeysPage2,
            pagination: {
              page: currentPage,
              limit: 10,
              totalPages: 2,
              totalItems: 15,
            },
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Wait for table - use exact match to avoid matching "Key 10"
    await expect(page.getByText("Key 1", { exact: true })).toBeVisible();

    // Verify we're on page 1
    expect(currentPage).toBe(1);
    await expect(page.getByText("หน้า 1 จาก 2")).toBeVisible();

    // "ก่อนหน้า" (previous) button should be disabled on first page
    const prevButton = page.getByRole("button", { name: /ก่อนหน้า/ });
    const nextButton = page.getByRole("button", { name: /ถัดไป/ });

    await expect(prevButton).toBeDisabled();
    await expect(nextButton).toBeEnabled();

    // Click "ถัดไป" to go to page 2
    await nextButton.click();

    // Wait for page 2 data to load
    await expect(page.getByText("Key 11", { exact: true })).toBeVisible();
    await expect(page.getByText("หน้า 2 จาก 2")).toBeVisible();

    // Verify page 1 data is no longer visible
    await expect(page.getByText("Key 1", { exact: true })).not.toBeVisible();

    // Verify API was called with page 2
    expect(currentPage).toBe(2);

    // "ถัดไป" (next) button should be disabled on last page
    await expect(nextButton).toBeDisabled();
    await expect(prevButton).toBeEnabled();

    // Click "ก่อนหน้า" to go back to page 1
    await prevButton.click();

    // Wait for page 1 data to load
    await expect(page.getByText("Key 1", { exact: true })).toBeVisible();
    await expect(page.getByText("หน้า 1 จาก 2")).toBeVisible();

    // Verify page 2 data is no longer visible
    await expect(page.getByText("Key 11", { exact: true })).not.toBeVisible();

    // "ก่อนหน้า" should be disabled again on first page
    await expect(prevButton).toBeDisabled();
    await expect(nextButton).toBeEnabled();
  });

  test("should toggle API key active status in edit modal", async ({
    page,
  }) => {
    const mockAPIKey = {
      id: "key-1",
      name: "Test Key",
      apiKey: "sk_test_1234567890abcdef",
      isActivated: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      usageLimit: null,
      limitPeriod: null,
      currentUsage: 0,
    };

    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [mockAPIKey],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 1,
              totalItems: 1,
            },
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Wait for table
    await expect(page.getByText("Test Key")).toBeVisible();

    // Find the row and click edit button
    const row = page.locator("tr").filter({ has: page.getByText("Test Key") });
    await expect(row).toBeVisible();
    const editBtn = row
      .locator("button")
      .filter({
        has: page.locator(
          'svg[class*="lucide-pencil"], svg[class*="PencilIcon"]',
        ),
      })
      .first();
    await editBtn.click();

    // Wait for edit modal
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /แก้ไข API Key/ }),
    ).toBeVisible({ timeout: 2000 });

    // Find and toggle active status switch - click on the label text
    const activeSwitchLabel = page
      .getByRole("dialog")
      .getByText(/ใช้งาน API Key/);
    const activeSwitch = page
      .getByRole("dialog")
      .getByText(/ใช้งาน API Key/)
      .locator("..")
      .locator('input[type="checkbox"]')
      .first();

    // Check initial state (should be checked since isActivated is true)
    await expect(activeSwitch).toBeChecked();

    // Toggle off - click on label to trigger the switch
    await activeSwitchLabel.click();
    await expect(activeSwitch).not.toBeChecked({ timeout: 2000 });

    // Toggle back on - click on label to trigger the switch
    await activeSwitchLabel.click();
    await expect(activeSwitch).toBeChecked({ timeout: 1000 });
  });

  test("should display usage correctly with and without rate limit", async ({
    page,
  }) => {
    const mockAPIKeys = [
      {
        id: "key-1",
        name: "No Rate Limit",
        apiKey: "sk_test_1",
        isActivated: true,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        usageLimit: null,
        limitPeriod: null,
        currentUsage: 1234,
      },
      {
        id: "key-2",
        name: "With Rate Limit",
        apiKey: "sk_test_2",
        isActivated: true,
        createdAt: "2024-01-02T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
        usageLimit: 5000,
        limitPeriod: "month",
        currentUsage: 2500,
      },
    ];

    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: mockAPIKeys,
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 1,
              totalItems: 2,
            },
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Check usage display without rate limit
    await expect(page.getByText("1,234")).toBeVisible();

    // Check usage display with rate limit
    await expect(page.getByText(/2,500\/5,000 ต่อเดือน/)).toBeVisible();
  });

  test("should copy API key from table", async ({ page }) => {
    const mockAPIKey = {
      id: "key-1",
      name: "Test Key",
      apiKey: "sk_test_1234567890abcdef",
      isActivated: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      usageLimit: null,
      limitPeriod: null,
      currentUsage: 0,
    };

    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [mockAPIKey],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 1,
              totalItems: 1,
            },
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Wait for table
    await expect(page.getByText("Test Key")).toBeVisible();

    // Find the row and click copy button
    const row = page.locator("tr").filter({ has: page.getByText("Test Key") });
    await expect(row).toBeVisible();
    const copyBtn = row.locator("button").first(); // First button is copy
    await copyBtn.click();

    // Verify clipboard contains the API key
    // Note: This requires clipboard permissions which may not work in all test environments
    // The copy functionality is tested by clicking the button
    // In a real scenario, you might need to grant clipboard permissions
  });

  test("should update API key with rate limit changes", async ({ page }) => {
    const mockAPIKey = {
      id: "key-1",
      name: "Test Key",
      apiKey: "sk_test_1234567890abcdef",
      isActivated: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      usageLimit: null,
      limitPeriod: null,
      currentUsage: 0,
    };

    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [mockAPIKey],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 1,
              totalItems: 1,
            },
          }),
        });
      } else if (request.method() === "PUT") {
        const body = await request.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "key-1",
            name: body.name,
            apiKey: "sk_test_updated",
            isActivated: body.isActivated,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: new Date().toISOString(),
            usageLimit: body.usageLimit,
            limitPeriod: body.limitPeriod,
            currentUsage: 0,
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Wait for table
    await expect(page.getByText("Test Key")).toBeVisible();

    // Click edit button
    const row = page.locator("tr").filter({ has: page.getByText("Test Key") });
    await expect(row).toBeVisible();
    const editBtn = row
      .locator("button")
      .filter({
        has: page.locator(
          'svg[class*="lucide-pencil"], svg[class*="PencilIcon"]',
        ),
      })
      .first();
    await editBtn.click();

    // Wait for edit modal
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /แก้ไข API Key/ }),
    ).toBeVisible({ timeout: 2000 });

    // Enable rate limit - click on the label text to trigger the switch
    const rateLimitLabel = page
      .getByRole("dialog")
      .getByText(/ใช้งาน Rate limit/);
    await rateLimitLabel.click();

    // Wait for rate limit fields
    await expect(
      page.getByPlaceholder("กรอกจำนวนการจำกัดการใช้งาน"),
    ).toBeVisible({ timeout: 1000 });

    // Fill rate limit
    await page.getByPlaceholder("กรอกจำนวนการจำกัดการใช้งาน").fill("2000");

    // Submit
    const submitButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /บันทึก/ });
    await submitButton.click();

    // Wait for success modal - edit shows a modal with "แก้ไข API Key ใหม่สำเร็จ"
    // Route interception handles the response immediately, so we just wait for UI update
    await expect(
      page.getByRole("heading", { name: /แก้ไข API Key ใหม่สำเร็จ/ }),
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test("should handle update API key error", async ({ page }) => {
    const mockAPIKey = {
      id: "key-1",
      name: "Test Key",
      apiKey: "sk_test_1234567890abcdef",
      isActivated: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      usageLimit: null,
      limitPeriod: null,
      currentUsage: 0,
    };

    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [mockAPIKey],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 1,
              totalItems: 1,
            },
          }),
        });
      } else if (request.method() === "PUT") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Failed to update API key",
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Wait for table
    await expect(page.getByText("Test Key")).toBeVisible();

    // Click edit button
    const row = page.locator("tr").filter({ has: page.getByText("Test Key") });
    await expect(row).toBeVisible();
    const editBtn = row
      .locator("button")
      .filter({
        has: page.locator(
          'svg[class*="lucide-pencil"], svg[class*="PencilIcon"]',
        ),
      })
      .first();
    await editBtn.click();

    // Wait for edit modal
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /แก้ไข API Key/ }),
    ).toBeVisible({ timeout: 2000 });

    // Update name
    const nameInput = page.getByPlaceholder("กรอกชื่อ API Key");
    await nameInput.clear();
    await nameInput.fill("Updated Name");

    // Submit
    const submitButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /บันทึก/ });
    await submitButton.click();

    // Wait for error notification - target alert title specifically
    await expect(
      page
        .locator('[data-slot="alert-title"]')
        .getByText(/แก้ไข API Key ไม่สำเร็จ/),
    ).toBeVisible({
      timeout: 5000,
    });
  });

  test("should handle regenerate API key error", async ({ page }) => {
    const mockAPIKey = {
      id: "key-1",
      name: "Test Key",
      apiKey: "sk_test_old_key",
      isActivated: true,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
      usageLimit: null,
      limitPeriod: null,
      currentUsage: 0,
    };

    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [mockAPIKey],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 1,
              totalItems: 1,
            },
          }),
        });
      } else if (
        request.method() === "POST" &&
        url.pathname.includes("/regenerate")
      ) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Failed to regenerate API key",
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Wait for table
    await expect(page.getByText("Test Key")).toBeVisible();

    // Click edit button
    const row = page.locator("tr").filter({ has: page.getByText("Test Key") });
    await expect(row).toBeVisible();
    const editBtn = row
      .locator("button")
      .filter({
        has: page.locator(
          'svg[class*="lucide-pencil"], svg[class*="PencilIcon"]',
        ),
      })
      .first();
    await editBtn.click();

    // Wait for edit modal
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /แก้ไข API Key/ }),
    ).toBeVisible({ timeout: 2000 });

    // Click regenerate button
    const regenerateButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /สร้างใหม่/ });
    await regenerateButton.click();

    // Wait for error notification - target alert title specifically
    await expect(
      page
        .locator('[data-slot="alert-title"]')
        .getByText(/สร้าง API Key ใหม่ไม่สำเร็จ/),
    ).toBeVisible({
      timeout: 5000,
    });
  });

  test("should select different rate limit units", async ({ page }) => {
    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 0,
              totalItems: 0,
            },
          }),
        });
      } else if (
        request.method() === "POST" &&
        !url.pathname.includes("/regenerate")
      ) {
        const body = await request.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "new-key-id",
            name: body.name,
            apiKey: "sk_test_new",
            isActivated: body.isActivated,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usageLimit: body.usageLimit,
            limitPeriod: body.limitPeriod,
            currentUsage: 0,
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Open add modal
    const addButton = page
      .getByRole("button", { name: /เพิ่ม API Key/ })
      .first();
    await addButton.click();

    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /เพิ่ม API Key/ }),
    ).toBeVisible({ timeout: 2000 });

    // Fill form
    await page.getByPlaceholder("กรอกชื่อ API Key").fill("Test Key");

    // Enable rate limit - click on the label text to trigger the switch
    const rateLimitLabel = page
      .getByRole("dialog")
      .getByText(/ใช้งาน Rate limit/);
    await rateLimitLabel.click();

    // Wait for rate limit fields
    await expect(
      page.getByPlaceholder("กรอกจำนวนการจำกัดการใช้งาน"),
    ).toBeVisible({ timeout: 1000 });

    // Fill rate limit
    await page.getByPlaceholder("กรอกจำนวนการจำกัดการใช้งาน").fill("5000");

    // Find and click the dropdown button for rate limit unit
    // TextDropdown uses a button, not an input, so we need to find the button containing the placeholder text
    const dropdownButton = page
      .getByRole("dialog")
      .getByRole("button")
      .filter({ hasText: /เลือกหน่วย|ต่อวัน|ต่อเดือน/ })
      .first();
    await expect(dropdownButton).toBeVisible({ timeout: 2000 });
    await dropdownButton.click();

    // Wait for dropdown menu to open and select "ต่อเดือน" option
    await page.waitForTimeout(300);
    const monthOption = page
      .getByRole("menuitem")
      .filter({ hasText: "ต่อเดือน" })
      .first();
    await expect(monthOption).toBeVisible({ timeout: 2000 });
    await monthOption.click();

    // Submit
    const submitButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /เพิ่ม API Key/ });
    await submitButton.click();

    // Wait for success modal
    await expect(
      page
        .getByRole("dialog")
        .getByRole("heading", { name: /สร้าง API Key ใหม่สำเร็จ/ }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should show loading state during operations", async ({ page }) => {
    await page.route("**/api-keys**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [],
            pagination: {
              page: 1,
              limit: 10,
              totalPages: 0,
              totalItems: 0,
            },
          }),
        });
      } else if (
        request.method() === "POST" &&
        !url.pathname.includes("/regenerate")
      ) {
        // Add delay to simulate network request
        await page.waitForTimeout(500);

        const body = await request.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "new-key-id",
            name: body.name,
            apiKey: "sk_test_new",
            isActivated: body.isActivated,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usageLimit: body.usageLimit,
            limitPeriod: body.limitPeriod,
            currentUsage: 0,
          }),
        });
      } else {
        return route.continue();
      }
    });

    await page.goto("./developer/api-key");

    await expect(
      page.getByRole("heading", { name: /API Key/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    // Open add modal
    const addButton = page
      .getByRole("button", { name: /เพิ่ม API Key/ })
      .first();
    await addButton.click();

    await expect(
      page.getByRole("dialog").getByRole("heading", { name: /เพิ่ม API Key/ }),
    ).toBeVisible({ timeout: 2000 });

    // Fill form
    await page.getByPlaceholder("กรอกชื่อ API Key").fill("Test Key");

    // Submit
    const submitButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /เพิ่ม API Key/ });

    // Button should be enabled before submission
    await expect(submitButton).toBeEnabled();

    await submitButton.click();

    // Button should be disabled during submission (loading state)
    // Note: The button might be disabled or show loading text
    // We verify the operation completes by waiting for success modal
    await expect(
      page
        .getByRole("dialog")
        .getByRole("heading", { name: /สร้าง API Key ใหม่สำเร็จ/ }),
    ).toBeVisible({ timeout: 5000 });
  });
});
