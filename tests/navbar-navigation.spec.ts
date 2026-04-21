import { expect, test } from "@playwright/test";

test.describe("Navbar Navigation", () => {
  test.describe("Authenticated User Navigation", () => {
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
        // Set cookie settings to prevent cookie popup from appearing
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

      // Mock chat rooms API
      await page.route("**/chat/rooms", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      // Mock user settings API
      await page.route("**/users/setting", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            enableEmailNotification: true,
          }),
        });
      });
    });

    test.describe("Main Navbar Links", () => {
      test("should navigate to Health Assistant (chatbot) page", async ({
        page,
      }) => {
        // Start from developer page
        await page.goto("./developer/chatbot-arena");

        // Wait for page to load
        await page.waitForLoadState("networkidle");

        // Find and click the "ผู้ช่วยสุขภาพ" link
        const healthAssistantLink = page.getByRole("link", {
          name: /ผู้ช่วยสุขภาพ/,
        });
        await expect(healthAssistantLink).toBeVisible({ timeout: 5000 });
        await healthAssistantLink.click();

        // Wait for navigation to chatbot page
        await page.waitForURL((url) => !url.pathname.includes("/auth/"), {
          timeout: 10000,
        });

        // Verify we're on the chatbot page
        const currentUrl = page.url();
        expect(currentUrl).not.toContain("/auth/");
      });

      test("should navigate to Developer (chatbot-arena) page", async ({
        page,
      }) => {
        // Start from chatbot page
        await page.goto("./");

        // Wait for page to load
        await page.waitForLoadState("networkidle");

        // Find and click the "สำหรับนักพัฒนา" link
        const developerLink = page.getByRole("link", {
          name: /สำหรับนักพัฒนา/,
        });
        await expect(developerLink).toBeVisible({ timeout: 5000 });
        await developerLink.click();

        // Wait for navigation to developer chatbot-arena page
        await page.waitForURL(
          (url) => url.pathname.includes("/developer/chatbot-arena"),
          {
            timeout: 10000,
          },
        );

        // Verify we're on the chatbot arena page
        const currentUrl = page.url();
        expect(currentUrl).toContain("/developer/chatbot-arena");
      });

      test("should show active state on current navbar link", async ({
        page,
      }) => {
        // Go to chatbot page
        await page.goto("./");
        await page.waitForLoadState("networkidle");

        // The "ผู้ช่วยสุขภาพ" link should have active styling (text-white bg-primary-600)
        const healthAssistantLink = page.getByRole("link", {
          name: /ผู้ช่วยสุขภาพ/,
        });
        await expect(healthAssistantLink).toBeVisible({ timeout: 5000 });
        // Active link has "text-white bg-primary-600" without hover: prefix
        await expect(healthAssistantLink).toHaveClass(/\btext-white\b/);

        // The "สำหรับนักพัฒนา" link should have inactive styling (text-primary-100)
        const developerLink = page.getByRole("link", {
          name: /สำหรับนักพัฒนา/,
        });
        await expect(developerLink).toBeVisible();
        await expect(developerLink).toHaveClass(/text-primary-100/);
      });

      test("should show active state on developer link when on developer page", async ({
        page,
      }) => {
        // Go to developer page
        await page.goto("./developer/chatbot-arena");
        await page.waitForLoadState("networkidle");

        // The "สำหรับนักพัฒนา" link should have active styling
        const developerLink = page.getByRole("link", {
          name: /สำหรับนักพัฒนา/,
        });
        await expect(developerLink).toBeVisible({ timeout: 5000 });
        await expect(developerLink).toHaveClass(/\btext-white\b/);

        // The "ผู้ช่วยสุขภาพ" link should have inactive styling
        const healthAssistantLink = page.getByRole("link", {
          name: /ผู้ช่วยสุขภาพ/,
        });
        await expect(healthAssistantLink).toBeVisible();
        await expect(healthAssistantLink).toHaveClass(/text-primary-100/);
      });
    });

    test.describe("Logo Navigation", () => {
      test("should navigate to home page when clicking logo", async ({
        page,
      }) => {
        // Start from chatbot page
        await page.goto("./");
        await page.waitForLoadState("networkidle");

        // Find and click the logo
        const logo = page
          .getByRole("link")
          .filter({ has: page.locator('img[alt="BDI Logo"]') });
        await expect(logo).toBeVisible({ timeout: 5000 });
        await logo.click();

        // Wait for navigation to home page (may have basePath like /dev-medical)
        await page.waitForURL(
          (url) =>
            url.pathname === "/" ||
            url.pathname === "" ||
            url.pathname.match(/^\/[^/]+\/?$/) !== null, // matches /basePath or /basePath/
          {
            timeout: 10000,
          },
        );

        // Verify we navigated to the home page (root)
        const currentUrl = page.url();
        expect(currentUrl).not.toContain("/settings");
        expect(currentUrl).not.toContain("/developer");
      });
    });

    test.describe("Profile Menu Navigation", () => {
      test("should display profile menu when clicking avatar", async ({
        page,
      }) => {
        await page.goto("./");
        await page.waitForLoadState("networkidle");

        // Find and click the avatar/profile button (shows user initials TU)
        const avatar = page
          .locator(".cursor-pointer")
          .filter({ hasText: "TU" });
        await expect(avatar).toBeVisible({ timeout: 5000 });
        await avatar.click();

        // Profile menu should be visible
        await expect(page.getByText("Test User")).toBeVisible({
          timeout: 3000,
        });
        await expect(page.getByText("test@example.com")).toBeVisible();

        // Menu items should be visible (edit profile is a link, logout is a button)
        await expect(
          page.getByRole("link", { name: /แก้ไขโปรไฟล์/ }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: /ออกจากระบบ/ }),
        ).toBeVisible();
      });

      test("should navigate to profile settings page from profile menu", async ({
        page,
      }) => {
        await page.goto("./");
        await page.waitForLoadState("networkidle");

        // Open profile menu
        const avatar = page
          .locator(".cursor-pointer")
          .filter({ hasText: "TU" });
        await avatar.click();

        // Click on "แก้ไขโปรไฟล์" link
        const editProfileButton = page.getByRole("link", {
          name: /แก้ไขโปรไฟล์/,
        });
        await expect(editProfileButton).toBeVisible({ timeout: 3000 });
        await editProfileButton.click();

        // Wait for navigation to profile settings page
        await page.waitForURL(
          (url) => url.pathname.includes("/settings/profile"),
          {
            timeout: 10000,
          },
        );

        // Verify we're on the profile settings page
        const currentUrl = page.url();
        expect(currentUrl).toContain("/settings/profile");

        // Verify the page loaded correctly
        await expect(
          page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
        ).toBeVisible({ timeout: 5000 });
      });

      test("should logout when clicking logout button", async ({ page }) => {
        // Mock logout API
        await page.route("**/auth/logout", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ success: true }),
          });
        });

        await page.goto("./");
        await page.waitForLoadState("networkidle");

        // Open profile menu
        const avatar = page
          .locator(".cursor-pointer")
          .filter({ hasText: "TU" });
        await avatar.click();

        // Click on "ออกจากระบบ"
        const logoutButton = page.getByRole("button", { name: /ออกจากระบบ/ });
        await expect(logoutButton).toBeVisible({ timeout: 3000 });
        await logoutButton.click();

        // Wait for navigation to login page after logout
        await page.waitForURL((url) => url.pathname.includes("/auth/login"), {
          timeout: 10000,
        });

        // Verify we navigated to the auth login page after logout
        const currentUrl = page.url();
        expect(currentUrl).toContain("/auth/login");
      });
    });
  });

  test.describe("Admin User Navigation", () => {
    test.beforeEach(async ({ page }) => {
      // Mock getMe API to return admin user data
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
            email: "admin@example.com",
            firstName: "Admin",
            lastName: "User",
            roles: ["admin"],
            emailVerified: true,
          }),
        });
      });

      // Set authentication cookies for admin user
      await page.context().addCookies([
        {
          name: "bdi-token-access",
          value: "mock-admin-access-token",
          domain: "localhost",
          path: "/",
        },
        {
          name: "bdi-token-user",
          value: JSON.stringify({
            id: "admin-user-id",
            email: "admin@example.com",
            firstName: "Admin",
            lastName: "User",
            roles: ["admin"],
          }),
          domain: "localhost",
          path: "/",
        },
        // Set cookie settings to prevent cookie popup from appearing
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

      // Mock chat rooms API
      await page.route("**/chat/rooms", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });
    });

    test("should display admin menu item for admin users", async ({ page }) => {
      await page.goto("./");
      await page.waitForLoadState("networkidle");

      // Open profile menu (admin initials AU)
      const avatar = page.locator(".cursor-pointer").filter({ hasText: "AU" });
      await expect(avatar).toBeVisible({ timeout: 5000 });
      await avatar.click();

      // Admin menu item should be visible
      await expect(page.getByRole("link", { name: /ผู้ดูแลระบบ/ })).toBeVisible(
        { timeout: 3000 },
      );
    });

    test("should navigate to admin page from profile menu", async ({
      page,
    }) => {
      await page.goto("./");
      await page.waitForLoadState("networkidle");

      // Open profile menu
      const avatar = page.locator(".cursor-pointer").filter({ hasText: "AU" });
      await avatar.click();

      // Click on "ผู้ดูแลระบบ" link
      const adminLink = page.getByRole("link", { name: /ผู้ดูแลระบบ/ });
      await expect(adminLink).toBeVisible({ timeout: 3000 });
      await adminLink.click();

      // Wait for navigation to admin page
      await page.waitForURL((url) => url.pathname.includes("/admin"), {
        timeout: 10000,
      });

      // Verify we're on the admin page
      const currentUrl = page.url();
      expect(currentUrl).toContain("/admin");
    });
  });

  test.describe("Non-Admin User Navigation", () => {
    test.beforeEach(async ({ page }) => {
      // Mock getMe API to return regular user data
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
        // Set cookie settings to prevent cookie popup from appearing
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

      // Mock chat rooms API
      await page.route("**/chat/rooms", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });
    });

    test("should not display admin menu item for non-admin users", async ({
      page,
    }) => {
      await page.goto("./");
      await page.waitForLoadState("networkidle");

      // Open profile menu
      const avatar = page.locator(".cursor-pointer").filter({ hasText: "TU" });
      await expect(avatar).toBeVisible({ timeout: 5000 });
      await avatar.click();

      // Wait for profile menu to be visible
      await expect(page.getByText("Test User")).toBeVisible({ timeout: 3000 });

      // Admin menu item should NOT be visible
      await expect(
        page.getByRole("link", { name: /ผู้ดูแลระบบ/ }),
      ).not.toBeVisible();
    });
  });

  test.describe("Settings Sidebar Navigation", () => {
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
        // Set cookie settings to prevent cookie popup from appearing
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

      // Mock user settings API
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
    });

    test("should display settings sidebar with profile and notification links", async ({
      page,
    }) => {
      await page.goto("./settings/profile");
      await page.waitForLoadState("networkidle");

      // Wait for page to load
      await expect(
        page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
      ).toBeVisible({ timeout: 5000 });

      // Sidebar should have profile link
      const profileSidebarLink = page
        .locator('[data-sidebar="menu-button"]')
        .filter({ hasText: "โปรไฟล์" });
      await expect(profileSidebarLink).toBeVisible();

      // Sidebar should have notification link
      const notificationSidebarLink = page
        .locator('[data-sidebar="menu-button"]')
        .filter({ hasText: "การแจ้งเตือน" });
      await expect(notificationSidebarLink).toBeVisible();
    });

    test("should navigate from profile to notification settings via sidebar", async ({
      page,
    }) => {
      await page.goto("./settings/profile");
      await page.waitForLoadState("networkidle");

      // Wait for page to load
      await expect(
        page.getByRole("heading", { name: /โปรไฟล์/ }).first(),
      ).toBeVisible({ timeout: 5000 });

      // Click on notification sidebar link
      const notificationSidebarLink = page
        .locator('[data-sidebar="menu-button"]')
        .filter({ hasText: "การแจ้งเตือน" });
      await notificationSidebarLink.click();

      // Wait for navigation to notification settings page
      await page.waitForURL(
        (url) => url.pathname.includes("/settings/notification"),
        {
          timeout: 10000,
        },
      );

      // Verify we're on the notification settings page
      const currentUrl = page.url();
      expect(currentUrl).toContain("/settings/notification");
    });

    test("should navigate from notification to profile settings via sidebar", async ({
      page,
    }) => {
      await page.goto("./settings/notification");
      await page.waitForLoadState("networkidle");

      // Click on profile sidebar link
      const profileSidebarLink = page
        .locator('[data-sidebar="menu-button"]')
        .filter({ hasText: "โปรไฟล์" });
      await expect(profileSidebarLink).toBeVisible({ timeout: 5000 });
      await profileSidebarLink.click();

      // Wait for navigation to profile settings page
      await page.waitForURL(
        (url) => url.pathname.includes("/settings/profile"),
        {
          timeout: 10000,
        },
      );

      // Verify we're on the profile settings page
      const currentUrl = page.url();
      expect(currentUrl).toContain("/settings/profile");
    });
  });

  test.describe("App Sidebar Navigation", () => {
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
        // Set cookie settings to prevent cookie popup from appearing
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

      // Mock chat rooms API
      await page.route("**/chat/rooms", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      // Mock medical reminder schedules API
      await page.route("**/medical-reminder-schedules**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [],
            pagination: {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            },
          }),
        });
      });

      // Mock appointments API
      await page.route("**/appointments**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [],
            pagination: {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0,
            },
          }),
        });
      });
    });

    test("should display app sidebar with chatbot, medical reminder, and appointment links", async ({
      page,
    }) => {
      // Use medical reminder page where sidebar shows full text
      await page.goto("./app/medical-reminder");
      await page.waitForLoadState("networkidle");

      // Sidebar should have chatbot link
      const chatbotSidebarLink = page
        .locator('[data-sidebar="menu-item"]')
        .filter({ hasText: "แชทบอท" });
      await expect(chatbotSidebarLink).toBeVisible({ timeout: 5000 });

      // Sidebar should have medical reminder link
      const medicalReminderSidebarLink = page
        .locator('[data-sidebar="menu-item"]')
        .filter({ hasText: "รายการแจ้งเตือนยา" });
      await expect(medicalReminderSidebarLink).toBeVisible();

      // Sidebar should have appointment link
      const appointmentSidebarLink = page
        .locator('[data-sidebar="menu-item"]')
        .filter({ hasText: "รายการนัดหมายแพทย์" });
      await expect(appointmentSidebarLink).toBeVisible();
    });

    test("should navigate from chatbot to medical reminder via sidebar", async ({
      page,
    }) => {
      await page.goto("./");
      await page.waitForLoadState("networkidle");

      // Wait for page to load
      await expect(page.getByPlaceholder("พิมพ์ข้อความที่นี่...")).toBeVisible({
        timeout: 5000,
      });

      // On chatbot page, sidebar shows only icons. Click on medical reminder link by href
      const medicalReminderSidebarLink = page.locator(
        '[data-sidebar="sidebar"] a[href*="/app/medical-reminder"]',
      );
      await expect(medicalReminderSidebarLink).toBeVisible({ timeout: 5000 });
      await medicalReminderSidebarLink.click();

      // Wait for navigation to medical reminder page
      await page.waitForURL(
        (url) => url.pathname.includes("/app/medical-reminder"),
        {
          timeout: 10000,
        },
      );

      // Verify we're on the medical reminder page
      const currentUrl = page.url();
      expect(currentUrl).toContain("/app/medical-reminder");
    });

    test("should navigate from chatbot to appointment via sidebar", async ({
      page,
    }) => {
      await page.goto("./");
      await page.waitForLoadState("networkidle");

      // Wait for page to load
      await expect(page.getByPlaceholder("พิมพ์ข้อความที่นี่...")).toBeVisible({
        timeout: 5000,
      });

      // On chatbot page, sidebar shows only icons. Click on appointment link by href
      const appointmentSidebarLink = page.locator(
        '[data-sidebar="sidebar"] a[href*="/app/appointment"]',
      );
      await expect(appointmentSidebarLink).toBeVisible({ timeout: 5000 });
      await appointmentSidebarLink.click();

      // Wait for navigation to appointment page
      await page.waitForURL(
        (url) => url.pathname.includes("/app/appointment"),
        {
          timeout: 10000,
        },
      );

      // Verify we're on the appointment page
      const currentUrl = page.url();
      expect(currentUrl).toContain("/app/appointment");
    });

    test("should navigate from medical reminder to chatbot via sidebar", async ({
      page,
    }) => {
      await page.goto("./app/medical-reminder");
      await page.waitForLoadState("networkidle");

      // Click on chatbot sidebar link
      const chatbotSidebarLink = page
        .locator('[data-sidebar="menu-item"]')
        .filter({ hasText: "แชทบอท" })
        .getByRole("link");
      await expect(chatbotSidebarLink).toBeVisible({ timeout: 5000 });
      await chatbotSidebarLink.click();

      // Wait for navigation to chatbot page
      await page.waitForURL((url) => !url.pathname.includes("/auth/"), {
        timeout: 10000,
      });

      // Verify we're on the chatbot page
      const currentUrl = page.url();
      expect(currentUrl).not.toContain("/auth/");
    });

    test("should navigate from medical reminder to appointment via sidebar", async ({
      page,
    }) => {
      await page.goto("./app/medical-reminder");
      await page.waitForLoadState("networkidle");

      // Click on appointment sidebar link
      const appointmentSidebarLink = page
        .locator('[data-sidebar="menu-item"]')
        .filter({ hasText: "รายการนัดหมายแพทย์" })
        .getByRole("link");
      await expect(appointmentSidebarLink).toBeVisible({ timeout: 5000 });
      await appointmentSidebarLink.click();

      // Wait for navigation to appointment page
      await page.waitForURL(
        (url) => url.pathname.includes("/app/appointment"),
        {
          timeout: 10000,
        },
      );

      // Verify we're on the appointment page
      const currentUrl = page.url();
      expect(currentUrl).toContain("/app/appointment");
    });

    test("should navigate from appointment to chatbot via sidebar", async ({
      page,
    }) => {
      await page.goto("./app/appointment");
      await page.waitForLoadState("networkidle");

      // Click on chatbot sidebar link
      const chatbotSidebarLink = page
        .locator('[data-sidebar="menu-item"]')
        .filter({ hasText: "แชทบอท" })
        .getByRole("link");
      await expect(chatbotSidebarLink).toBeVisible({ timeout: 5000 });
      await chatbotSidebarLink.click();

      // Wait for navigation to chatbot page
      await page.waitForURL((url) => !url.pathname.includes("/auth/"), {
        timeout: 10000,
      });

      // Verify we're on the chatbot page
      const currentUrl = page.url();
      expect(currentUrl).not.toContain("/auth/");
    });

    test("should navigate from appointment to medical reminder via sidebar", async ({
      page,
    }) => {
      await page.goto("./app/appointment");
      await page.waitForLoadState("networkidle");

      // Click on medical reminder sidebar link
      const medicalReminderSidebarLink = page
        .locator('[data-sidebar="menu-item"]')
        .filter({ hasText: "รายการแจ้งเตือนยา" })
        .getByRole("link");
      await expect(medicalReminderSidebarLink).toBeVisible({ timeout: 5000 });
      await medicalReminderSidebarLink.click();

      // Wait for navigation to medical reminder page
      await page.waitForURL(
        (url) => url.pathname.includes("/app/medical-reminder"),
        {
          timeout: 10000,
        },
      );

      // Verify we're on the medical reminder page
      const currentUrl = page.url();
      expect(currentUrl).toContain("/app/medical-reminder");
    });

    test("should navigate chatbot -> medical reminder -> appointment -> chatbot", async ({
      page,
    }) => {
      // Start at chatbot
      await page.goto("./");
      await page.waitForLoadState("networkidle");

      // Navigate to medical reminder (using href selector since chatbot page shows icon-only sidebar)
      const medicalReminderLink = page.locator(
        '[data-sidebar="sidebar"] a[href*="/app/medical-reminder"]',
      );
      await medicalReminderLink.click();
      await page.waitForURL(
        (url) => url.pathname.includes("/app/medical-reminder"),
        { timeout: 10000 },
      );
      expect(page.url()).toContain("/app/medical-reminder");

      // Navigate to appointment (medical reminder page shows full sidebar)
      const appointmentLink = page
        .locator('[data-sidebar="menu-item"]')
        .filter({ hasText: "รายการนัดหมายแพทย์" })
        .getByRole("link");
      await appointmentLink.click();
      await page.waitForURL(
        (url) => url.pathname.includes("/app/appointment"),
        { timeout: 10000 },
      );
      expect(page.url()).toContain("/app/appointment");

      // Navigate back to chatbot (appointment page shows full sidebar)
      const chatbotLink = page
        .locator('[data-sidebar="menu-item"]')
        .filter({ hasText: "แชทบอท" })
        .getByRole("link");
      await chatbotLink.click();
      await page.waitForURL((url) => !url.pathname.includes("/auth/"), {
        timeout: 10000,
      });
      expect(page.url()).not.toContain("/auth/");
    });
  });

  test.describe("Cross-Section Navigation", () => {
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
        // Set cookie settings to prevent cookie popup from appearing
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

      // Mock chat rooms API
      await page.route("**/chat/rooms", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      // Mock user settings API
      await page.route("**/users/setting", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            enableEmailNotification: true,
          }),
        });
      });
    });

    test("should navigate from settings to chatbot via navbar", async ({
      page,
    }) => {
      await page.goto("./settings/profile");
      await page.waitForLoadState("networkidle");

      // Click on Health Assistant navbar link
      const healthAssistantLink = page.getByRole("link", {
        name: /ผู้ช่วยสุขภาพ/,
      });
      await expect(healthAssistantLink).toBeVisible({ timeout: 5000 });
      await healthAssistantLink.click();

      // Wait for navigation to chatbot page
      await page.waitForURL((url) => !url.pathname.includes("/auth/"), {
        timeout: 10000,
      });

      // Verify we're on the chatbot page
      const currentUrl = page.url();
      expect(currentUrl).not.toContain("/auth/");
    });

    test("should navigate from settings to developer area via navbar", async ({
      page,
    }) => {
      await page.goto("./settings/profile");
      await page.waitForLoadState("networkidle");

      // Click on Developer navbar link
      const developerLink = page.getByRole("link", {
        name: /สำหรับนักพัฒนา/,
      });
      await expect(developerLink).toBeVisible({ timeout: 5000 });
      await developerLink.click();

      // Wait for navigation to developer page
      await page.waitForURL(
        (url) => url.pathname.includes("/developer/chatbot-arena"),
        {
          timeout: 10000,
        },
      );

      // Verify we're on the developer page
      const currentUrl = page.url();
      expect(currentUrl).toContain("/developer/chatbot-arena");
    });

    test("should navigate chatbot -> developer -> profile -> chatbot", async ({
      page,
    }) => {
      // Start at chatbot
      await page.goto("./");
      await page.waitForLoadState("networkidle");

      // Navigate to developer
      const developerLink = page.getByRole("link", {
        name: /สำหรับนักพัฒนา/,
      });
      await developerLink.click();
      await page.waitForURL(
        (url) => url.pathname.includes("/developer/chatbot-arena"),
        { timeout: 10000 },
      );
      expect(page.url()).toContain("/developer/chatbot-arena");

      // Navigate to profile via profile menu
      const avatar = page.locator(".cursor-pointer").filter({ hasText: "TU" });
      await avatar.click();
      const editProfileLink = page.getByRole("link", {
        name: /แก้ไขโปรไฟล์/,
      });
      await editProfileLink.click();
      await page.waitForURL(
        (url) => url.pathname.includes("/settings/profile"),
        { timeout: 10000 },
      );
      expect(page.url()).toContain("/settings/profile");

      // Navigate back to chatbot
      const healthAssistantLink = page.getByRole("link", {
        name: /ผู้ช่วยสุขภาพ/,
      });
      await healthAssistantLink.click();
      await page.waitForURL((url) => !url.pathname.includes("/auth/"), {
        timeout: 10000,
      });
      expect(page.url()).not.toContain("/auth/");
    });
  });
});
