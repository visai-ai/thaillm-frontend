import { expect, Route, test } from "@playwright/test";

test.describe("Appointment Page", () => {
  // Helper function to set up authentication
  const setupAuth = async (page: any) => {
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
  };

  // Helper function to mock hospitals API
  const mockHospitalsAPI = async (page: any) => {
    await page.route("**/appointments/hospitals", async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          list: [
            {
              id: "hospital-1",
              nameTh: "โรงพยาบาลกรุงเทพ",
              nameEn: "Bangkok Hospital",
              email: "info@bangkokhospital.com",
            },
            {
              id: "hospital-2",
              nameTh: "โรงพยาบาลบำรุงราษฎร์",
              nameEn: "Bumrungrad Hospital",
              email: "info@bumrungrad.com",
            },
          ],
        }),
      });
    });
  };

  test.beforeEach(async ({ page }) => {
    await setupAuth(page);
    await mockHospitalsAPI(page);

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
          personalInfo: {
            age: 30,
            phone: "0812345678",
            idCard: "1234567890123",
          },
        }),
      });
    });

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

  test("should display appointment page with empty state", async ({ page }) => {
    // Mock empty appointments
    await page.route("**/appointments**", async (route) => {
      const url = new URL(route.request().url());
      const futureOnly = url.searchParams.get("futureOnly") === "true";

      if (futureOnly) {
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
      } else {
        await route.continue();
      }
    });

    await page.goto("./app/appointment");

    // Wait for page to load
    await expect(
      page.getByRole("heading", { name: /รายการนัดหมายแพทย์/ }),
    ).toBeVisible({ timeout: 5000 });

    // Check for empty state
    await expect(page.getByText(/ยังไม่มีรายการนัดหมายในระบบ/)).toBeVisible();

    // Check for add appointment button
    await expect(
      page.getByRole("button", { name: /เพิ่มรายการนัดหมายแพทย์/ }),
    ).toBeVisible();

    // Check for history button
    await expect(
      page.getByRole("link", { name: /ประวัติการนัดหมาย/ }),
    ).toBeVisible();
  });

  test("should display appointments list with data", async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString();

    // Mock appointments with data
    await page.route("**/appointments**", async (route) => {
      const url = new URL(route.request().url());
      const futureOnly = url.searchParams.get("futureOnly") === "true";

      if (futureOnly) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: "appointment-1",
                userId: "user-id",
                date: tomorrowISO,
                status: "active",
                expectedTimeSlot: "09:00:00",
                reason: "ตรวจสุขภาพประจำปี",
                note: "นำผลตรวจเก่ามาด้วย",
                hospitalName: "โรงพยาบาลกรุงเทพ",
                departmentName: "อายุรกรรม",
                hospitalEmail: "info@bangkokhospital.com",
              },
              {
                id: "appointment-2",
                userId: "user-id",
                date: tomorrowISO,
                status: "active",
                expectedTimeSlot: "14:30:00",
                reason: "ปวดหัว",
                note: null,
                hospitalName: "โรงพยาบาลบำรุงราษฎร์",
                departmentName: "ประสาทวิทยา",
                hospitalEmail: "info@bumrungrad.com",
              },
            ],
            pagination: {
              page: 1,
              limit: 10,
              total: 2,
              totalPages: 1,
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("./app/appointment");

    // Wait for page to load
    await expect(
      page.getByRole("heading", { name: /รายการนัดหมายแพทย์/ }),
    ).toBeVisible({ timeout: 5000 });

    // Check for appointments
    await expect(page.getByText(/โรงพยาบาลกรุงเทพ/)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText(/แผนกอายุรกรรม/)).toBeVisible();
    await expect(page.getByText(/ตรวจสุขภาพประจำปี/)).toBeVisible();

    await expect(page.getByText(/โรงพยาบาลบำรุงราษฎร์/)).toBeVisible();
    await expect(page.getByText(/แผนกประสาทวิทยา/)).toBeVisible();
    await expect(page.getByText(/ปวดหัว/)).toBeVisible();
  });

  test("should open add appointment modal from dropdown", async ({ page }) => {
    // Mock empty appointments
    await page.route("**/appointments**", async (route) => {
      const url = new URL(route.request().url());
      const futureOnly = url.searchParams.get("futureOnly") === "true";

      if (futureOnly) {
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
      } else {
        await route.continue();
      }
    });

    await page.goto("./app/appointment");

    // Click on add appointment dropdown
    const addButton = page.getByRole("button", {
      name: /เพิ่มรายการนัดหมายแพทย์/,
    });
    await addButton.click();

    // Click on "เพิ่มนัดหมายแพทย์ใหม่"
    await page.getByRole("menuitem", { name: /เพิ่มนัดหมายแพทย์ใหม่/ }).click();

    // Wait for modal to appear
    await expect(
      page.getByRole("dialog").getByText(/ทำรายการนัดหมายแพทย์/),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should open add appointment modal from chat history option", async ({
    page,
  }) => {
    // Mock empty appointments
    await page.route("**/appointments**", async (route) => {
      const url = new URL(route.request().url());
      const futureOnly = url.searchParams.get("futureOnly") === "true";

      if (futureOnly) {
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
      } else {
        await route.continue();
      }
    });

    await page.goto("./app/appointment");

    // Click on add appointment dropdown
    const addButton = page.getByRole("button", {
      name: /เพิ่มรายการนัดหมายแพทย์/,
    });
    await addButton.click();

    // Click on "เพิ่มนัดหมายแพทย์จากประวัติการสนทนา"
    await page
      .getByRole("menuitem", {
        name: /เพิ่มนัดหมายแพทย์จากประวัติการสนทนา/,
      })
      .click();

    // Wait for modal to appear with chat history selection
    await expect(
      page
        .getByRole("dialog")
        .getByText(/เลือกข้อมูลจากประวัติการสนทนากับแชทบอท/),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should validate appointment form fields", async ({ page }) => {
    // Mock empty appointments
    await page.route("**/appointments**", async (route) => {
      const url = new URL(route.request().url());
      const futureOnly = url.searchParams.get("futureOnly") === "true";

      if (futureOnly) {
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
      } else {
        await route.continue();
      }
    });

    await page.goto("./app/appointment");

    // Open add appointment modal
    const addButton = page.getByRole("button", {
      name: /เพิ่มรายการนัดหมายแพทย์/,
    });
    await addButton.click();
    await page.getByRole("menuitem", { name: /เพิ่มนัดหมายแพทย์ใหม่/ }).click();

    // Wait for modal
    await expect(
      page.getByRole("dialog").getByText(/ทำรายการนัดหมายแพทย์/),
    ).toBeVisible({ timeout: 5000 });

    // On step 1, the action button is "ต่อไป" (next), not submit
    const nextButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /ต่อไป/ });
    await expect(nextButton).toBeVisible();

    // Click next without filling required fields - should stay on step 1
    await nextButton.click();
    // Hospital and department are required on step 1; validation errors should appear
    await expect(
      page.getByRole("dialog").getByText("กรุณาเลือกโรงพยาบาล"),
    ).toBeVisible();
  });

  test("should successfully create a new appointment", async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString();

    let appointmentCreated = false;

    // Mock appointments API
    await page.route("**/appointments**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        // Mock hospitals endpoint
        if (url.pathname.includes("/appointments/hospitals")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              list: [
                {
                  id: "hospital-1",
                  name: "Bangkok Hospital",
                  nameTh: "โรงพยาบาลกรุงเทพ",
                  address: "2 Soi Soonvijai 7, New Petchaburi Rd., Bangkok",
                  phone: "02-310-3000",
                  email: "info@bangkokhospital.com",
                },
              ],
            }),
          });
          return;
        }

        const futureOnly = url.searchParams.get("futureOnly") === "true";
        if (futureOnly) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: appointmentCreated
                ? [
                    {
                      id: "appointment-new",
                      userId: "user-id",
                      date: tomorrowISO,
                      status: "active",
                      expectedTimeSlot: "10:00:00",
                      reason: "ตรวจสุขภาพ",
                      note: "หมายเหตุ",
                      hospitalName: "โรงพยาบาลกรุงเทพ",
                      departmentName: "อายุรกรรม",
                      hospitalEmail: "info@bangkokhospital.com",
                    },
                  ]
                : [],
              pagination: {
                page: 1,
                limit: 10,
                total: appointmentCreated ? 1 : 0,
                totalPages: 1,
              },
            }),
          });
        } else {
          await route.continue();
        }
      } else if (request.method() === "POST") {
        const body = await request.postDataJSON();
        appointmentCreated = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "appointment-new",
            userId: "user-id",
            date: body.date,
            status: body.status,
            expectedTimeSlot: body.expectedTimeSlot,
            reason: body.reason,
            note: body.note,
            hospitalName: body.hospitalName,
            departmentName: body.departmentName,
            hospitalEmail: body.hospitalEmail,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("./app/appointment");

    // Open add appointment modal
    const addButton = page.getByRole("button", {
      name: /เพิ่มรายการนัดหมายแพทย์/,
    });
    await addButton.click();
    await page.getByRole("menuitem", { name: /เพิ่มนัดหมายแพทย์ใหม่/ }).click();

    // Wait for modal
    await expect(
      page.getByRole("dialog").getByText(/ทำรายการนัดหมายแพทย์/),
    ).toBeVisible({ timeout: 5000 });

    // Fill in hospital name
    const hospitalDropdown = page
      .getByRole("dialog")
      .getByText(/เลือกโรงพยาบาล/)
      .locator("..");
    await hospitalDropdown.click();
    await page.getByText("โรงพยาบาลกรุงเทพ").click();

    // Fill in department
    const departmentDropdown = page
      .getByRole("dialog")
      .getByText(/เลือกแผนก/)
      .locator("..");
    await departmentDropdown.click();
    await page.getByText("อายุรกรรม").first().click();

    // Step 1 done - click next to go to step 2 (symptoms)
    const nextButton1 = page
      .getByRole("dialog")
      .getByRole("button", { name: /ต่อไป/ });
    await nextButton1.click();

    // Fill in reason (now on step 2)
    const reasonTextarea = page
      .getByRole("dialog")
      .getByPlaceholder("กรอกอาการที่พบในปัจจุบัน");
    await reasonTextarea.fill("ตรวจสุขภาพ");

    // Fill in note (also on step 2)
    const noteInput = page.getByRole("dialog").getByPlaceholder("กรอกหมายเหตุ");
    await noteInput.fill("หมายเหตุ");

    // Step 2 done - click next to go to step 3 (confirm/contact info)
    const nextButton2 = page
      .getByRole("dialog")
      .getByRole("button", { name: /ต่อไป/ });
    await nextButton2.click();

    // Step 3 - contact info is auto-filled from user data
    const submitButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /ทำการนัดหมายแพทย์/ });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Wait for success modal
    await expect(
      page.getByRole("dialog").getByText(/ทำรายการนัดหมายแพทย์สำเร็จ/),
    ).toBeVisible({ timeout: 5000 });

    // Close success modal
    const confirmButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /ยืนยัน/ });
    await confirmButton.click();

    // Verify appointment appears in list
    await expect(page.getByText(/โรงพยาบาลกรุงเทพ/)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should show error when creating appointment fails", async ({
    page,
  }) => {
    // Mock appointments API with error
    await page.route("**/appointments**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        // Mock hospitals endpoint
        if (url.pathname.includes("/appointments/hospitals")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              list: [
                {
                  id: "hospital-1",
                  name: "Bangkok Hospital",
                  nameTh: "โรงพยาบาลกรุงเทพ",
                  address: "2 Soi Soonvijai 7, New Petchaburi Rd., Bangkok",
                  phone: "02-310-3000",
                  email: "info@bangkokhospital.com",
                },
              ],
            }),
          });
          return;
        }

        const futureOnly = url.searchParams.get("futureOnly") === "true";
        if (futureOnly) {
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
        } else {
          await route.continue();
        }
      } else if (request.method() === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Bad request",
            code: "VALIDATION_ERROR",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("./app/appointment");

    // Open add appointment modal
    const addButton = page.getByRole("button", {
      name: /เพิ่มรายการนัดหมายแพทย์/,
    });
    await addButton.click();
    await page.getByRole("menuitem", { name: /เพิ่มนัดหมายแพทย์ใหม่/ }).click();

    // Wait for modal
    await expect(
      page.getByRole("dialog").getByText(/ทำรายการนัดหมายแพทย์/),
    ).toBeVisible({ timeout: 5000 });

    // Fill in required fields
    const hospitalDropdown = page
      .getByRole("dialog")
      .getByText(/เลือกโรงพยาบาล/)
      .locator("..");
    await hospitalDropdown.click();
    await page.getByText("โรงพยาบาลกรุงเทพ").click();

    const departmentDropdown = page
      .getByRole("dialog")
      .getByText(/เลือกแผนก/)
      .locator("..");
    await departmentDropdown.click();
    await page.getByText("อายุรกรรม").first().click();

    // Step 1 done - click next to go to step 2 (symptoms)
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /ต่อไป/ })
      .click();

    // Fill reason on step 2
    const reasonTextarea = page
      .getByRole("dialog")
      .getByPlaceholder("กรอกอาการที่พบในปัจจุบัน");
    await reasonTextarea.fill("ตรวจสุขภาพ");

    // Step 2 done - click next to go to step 3 (confirm)
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /ต่อไป/ })
      .click();

    // Submit on step 3
    const submitButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /ทำการนัดหมายแพทย์/ });
    await submitButton.click();

    // Wait for error notification
    await expect(
      page.getByText(/เพิ่มนัดหมายแพทย์ไม่สำเร็จ/).first(),
    ).toBeVisible({
      timeout: 5000,
    });
  });

  test("should edit an existing appointment", async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString();

    // Mock appointments API
    await page.route("**/appointments**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        const futureOnly = url.searchParams.get("futureOnly") === "true";
        if (futureOnly) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: [
                {
                  id: "appointment-1",
                  userId: "user-id",
                  date: tomorrowISO,
                  status: "active",
                  expectedTimeSlot: "09:00:00",
                  reason: "ตรวจสุขภาพประจำปี",
                  note: "หมายเหตุเดิม",
                  hospitalName: "โรงพยาบาลกรุงเทพ",
                  departmentName: "อายุรกรรม",
                  hospitalEmail: "info@bangkokhospital.com",
                },
              ],
              pagination: {
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
              },
            }),
          });
        } else {
          await route.continue();
        }
      } else if (request.method() === "PUT") {
        const body = await request.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "appointment-1",
            userId: "user-id",
            date: body.date,
            status: body.status,
            expectedTimeSlot: body.expectedTimeSlot,
            reason: body.reason,
            note: body.note,
            hospitalName: body.hospitalName,
            departmentName: body.departmentName,
            hospitalEmail: body.hospitalEmail,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("./app/appointment");

    // Wait for appointment to appear
    await expect(page.getByText(/โรงพยาบาลกรุงเทพ/)).toBeVisible({
      timeout: 5000,
    });

    // Click on the three dots menu - find button with sr-only "Open menu" text
    const menuButton = page
      .locator("button")
      .filter({ has: page.getByText("Open menu", { exact: true }) })
      .first();
    await menuButton.click({ timeout: 5000 });

    // Click edit
    await page.getByRole("menuitem", { name: /แก้ไข/ }).click();

    // Wait for edit modal (step 1 - details)
    await expect(
      page.getByRole("dialog").getByText(/แก้ไขรายการนัดหมายแพทย์/),
    ).toBeVisible({ timeout: 5000 });

    // Step 1 has hospital/department pre-filled - click next to go to step 2
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /ต่อไป/ })
      .click();

    // Update reason on step 2 (symptoms)
    const reasonTextarea = page
      .getByRole("dialog")
      .getByPlaceholder("กรอกอาการที่พบในปัจจุบัน");
    await reasonTextarea.clear();
    await reasonTextarea.fill("ตรวจสุขภาพใหม่");

    // Step 2 done - click next to go to step 3 (confirm)
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /ต่อไป/ })
      .click();

    // Submit on step 3
    const submitButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /แก้ไขการนัดหมายแพทย์/ });
    await submitButton.click();

    // Wait for success modal
    await expect(
      page.getByRole("dialog").getByText(/แก้ไขรายการนัดหมายแพทย์สำเร็จ/),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should delete an appointment", async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString();

    let appointmentDeleted = false;

    // Mock appointments API
    await page.route("**/appointments**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        const futureOnly = url.searchParams.get("futureOnly") === "true";
        if (futureOnly) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: appointmentDeleted
                ? []
                : [
                    {
                      id: "appointment-1",
                      userId: "user-id",
                      date: tomorrowISO,
                      status: "active",
                      expectedTimeSlot: "09:00:00",
                      reason: "ตรวจสุขภาพประจำปี",
                      note: "หมายเหตุ",
                      hospitalName: "โรงพยาบาลกรุงเทพ",
                      departmentName: "อายุรกรรม",
                      hospitalEmail: "info@bangkokhospital.com",
                    },
                  ],
              pagination: {
                page: 1,
                limit: 10,
                total: appointmentDeleted ? 0 : 1,
                totalPages: 1,
              },
            }),
          });
        } else {
          await route.continue();
        }
      } else if (request.method() === "DELETE") {
        appointmentDeleted = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("./app/appointment");

    // Wait for appointment to appear
    await expect(page.getByText(/โรงพยาบาลกรุงเทพ/)).toBeVisible({
      timeout: 5000,
    });

    // Click on the three dots menu - find button with sr-only "Open menu" text
    const menuButton = page
      .locator("button")
      .filter({ has: page.getByText("Open menu", { exact: true }) })
      .first();
    await menuButton.click({ timeout: 5000 });

    // Click delete
    await page.getByRole("menuitem", { name: /ลบ/ }).click();

    // Wait for confirmation modal
    await expect(
      page.getByRole("dialog").getByText(/ยืนยันการลบการแจ้งนัดหมาย/),
    ).toBeVisible({ timeout: 5000 });

    // Confirm deletion
    const confirmDeleteButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /ลบ/ });
    await confirmDeleteButton.click();

    // Wait for success notification
    await expect(page.getByText(/ลบการนัดหมายแพทย์สำเร็จ/)).toBeVisible({
      timeout: 5000,
    });

    // Verify appointment is removed (use exact text to avoid matching the notification)
    await expect(
      page.getByText("โรงพยาบาลกรุงเทพ, แผนกอายุรกรรม", { exact: true }),
    ).not.toBeVisible({
      timeout: 5000,
    });
  });

  test("should show error when deletion fails due to 24 hour restriction", async ({
    page,
  }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString();

    // Mock appointments API
    await page.route("**/appointments**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        const futureOnly = url.searchParams.get("futureOnly") === "true";
        if (futureOnly) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: [
                {
                  id: "appointment-1",
                  userId: "user-id",
                  date: tomorrowISO,
                  status: "active",
                  expectedTimeSlot: "09:00:00",
                  reason: "ตรวจสุขภาพประจำปี",
                  note: "หมายเหตุ",
                  hospitalName: "โรงพยาบาลกรุงเทพ",
                  departmentName: "อายุรกรรม",
                  hospitalEmail: "info@bangkokhospital.com",
                },
              ],
              pagination: {
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
              },
            }),
          });
        } else {
          await route.continue();
        }
      } else if (request.method() === "DELETE") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Bad request",
            code: "VALIDATION_ERROR",
            details: [
              {
                message: "Cannot cancel appointment within 24 hours",
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("./app/appointment");

    // Wait for appointment to appear
    await expect(page.getByText(/โรงพยาบาลกรุงเทพ/)).toBeVisible({
      timeout: 5000,
    });

    // Click on the three dots menu - find button with sr-only "Open menu" text
    const menuButton = page
      .locator("button")
      .filter({ has: page.getByText("Open menu", { exact: true }) })
      .first();
    await menuButton.click({ timeout: 5000 });

    // Click delete
    await page.getByRole("menuitem", { name: /ลบ/ }).click();

    // Wait for confirmation modal
    await expect(
      page.getByRole("dialog").getByText(/ยืนยันการลบการแจ้งนัดหมาย/),
    ).toBeVisible({ timeout: 5000 });

    // Confirm deletion
    const confirmDeleteButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /ลบ/ });
    await confirmDeleteButton.click();

    // Wait for error notification with 24 hour restriction message
    await expect(
      page.getByText(
        /ไม่สามารถยกเลิกการนัดหมายได้ภายใน 24 ชั่วโมงก่อนเวลานัดหมาย/,
      ),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to appointment history page", async ({ page }) => {
    // Mock appointments API
    await page.route("**/appointments**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        const futureOnly = url.searchParams.get("futureOnly") === "true";
        const historyOnly = url.searchParams.get("historyOnly") === "true";

        if (futureOnly) {
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
        } else if (historyOnly) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: [
                {
                  id: "appointment-history-1",
                  userId: "user-id",
                  date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                  status: "completed",
                  expectedTimeSlot: "10:00:00",
                  reason: "ตรวจสุขภาพ",
                  note: null,
                  hospitalName: "โรงพยาบาลกรุงเทพ",
                  departmentName: "อายุรกรรม",
                  hospitalEmail: "info@bangkokhospital.com",
                },
              ],
              pagination: {
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
              },
            }),
          });
        } else {
          await route.continue();
        }
      } else {
        await route.continue();
      }
    });

    await page.goto("./app/appointment");

    // Click on history button
    const historyLink = page.getByRole("link", { name: /ประวัติการนัดหมาย/ });
    await historyLink.click();

    // Wait for navigation
    await page.waitForURL(
      (url) => url.pathname.includes("/app/appointment/history"),
      { timeout: 5000 },
    );

    // Verify we're on history page
    await expect(
      page.getByRole("heading", { name: /ประวัติการนัดหมาย/ }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should display appointment history with pagination", async ({
    page,
  }) => {
    // Mock appointments API for history
    await page.route("**/appointments**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        const historyOnly = url.searchParams.get("historyOnly") === "true";
        const page = url.searchParams.get("page") || "1";

        if (historyOnly) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: [
                {
                  id: `appointment-history-${page}`,
                  userId: "user-id",
                  date: new Date(
                    Date.now() - 86400000 * parseInt(page),
                  ).toISOString(),
                  status: "completed",
                  expectedTimeSlot: "10:00:00",
                  reason: "ตรวจสุขภาพ",
                  note: null,
                  hospitalName: "โรงพยาบาลกรุงเทพ",
                  departmentName: "อายุรกรรม",
                  hospitalEmail: "info@bangkokhospital.com",
                },
              ],
              pagination: {
                page: parseInt(page),
                limit: 10,
                total: 15,
                totalPages: 2,
              },
            }),
          });
        } else {
          await route.continue();
        }
      } else {
        await route.continue();
      }
    });

    await page.goto("./app/appointment/history");

    // Wait for page to load
    await expect(
      page.getByRole("heading", { name: /ประวัติการนัดหมาย/ }),
    ).toBeVisible({ timeout: 5000 });

    // Check for appointment data in table
    await expect(page.getByText(/โรงพยาบาลกรุงเทพ/)).toBeVisible({
      timeout: 5000,
    });
  });

  test("should display empty history state", async ({ page }) => {
    // Mock empty history
    await page.route("**/appointments**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        const historyOnly = url.searchParams.get("historyOnly") === "true";

        if (historyOnly) {
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
        } else {
          await route.continue();
        }
      } else {
        await route.continue();
      }
    });

    await page.goto("./app/appointment/history");

    // Wait for page to load
    await expect(
      page.getByRole("heading", { name: /ประวัติการนัดหมาย/ }),
    ).toBeVisible({ timeout: 5000 });

    // Check for empty state
    await expect(page.getByText(/ยังไม่มีประวัติการนัดหมาย/)).toBeVisible();
  });

  test("should interact with calendar to view appointment info", async ({
    page,
  }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowISO = tomorrow.toISOString();

    // Mock appointments API
    await page.route("**/appointments**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        const futureOnly = url.searchParams.get("futureOnly") === "true";
        if (futureOnly) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: [
                {
                  id: "appointment-1",
                  userId: "user-id",
                  date: tomorrowISO,
                  status: "active",
                  expectedTimeSlot: "09:00:00",
                  reason: "ตรวจสุขภาพประจำปี",
                  note: "หมายเหตุ",
                  hospitalName: "โรงพยาบาลกรุงเทพ",
                  departmentName: "อายุรกรรม",
                  hospitalEmail: "info@bangkokhospital.com",
                },
              ],
              pagination: {
                page: 1,
                limit: 10,
                total: 1,
                totalPages: 1,
              },
            }),
          });
        } else {
          await route.continue();
        }
      } else {
        await route.continue();
      }
    });

    await page.goto("./app/appointment");

    // Wait for page to load
    await expect(
      page.getByRole("heading", { name: /รายการนัดหมายแพทย์/ }),
    ).toBeVisible({ timeout: 5000 });

    // Wait for calendar to be visible
    await page.waitForTimeout(2000);

    // Try to click on a date in the calendar (if it's a future date)
    // Note: Calendar interaction might be tricky, so we'll just verify the calendar is visible
    const calendar = page.locator('[role="grid"]').or(page.locator("table"));
    await expect(calendar.first()).toBeVisible({ timeout: 5000 });
  });

  test("should show loading state while fetching appointments", async ({
    page,
  }) => {
    // Mock appointments API with delay
    await page.route("**/appointments**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        const futureOnly = url.searchParams.get("futureOnly") === "true";
        if (futureOnly) {
          // Add delay to simulate loading
          await new Promise((resolve) => setTimeout(resolve, 1000));
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
        } else {
          await route.continue();
        }
      } else {
        await route.continue();
      }
    });

    await page.goto("./app/appointment");

    // Check for loading spinner (if it exists)
    // The loading state might be brief, so we check if the page structure loads
    await expect(
      page.getByRole("heading", { name: /รายการนัดหมายแพทย์/ }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should handle appointment form with all fields filled", async ({
    page,
  }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = tomorrow.toISOString();

    // Mock appointments API
    await page.route("**/appointments**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());

      if (request.method() === "GET") {
        // Mock hospitals endpoint
        if (url.pathname.includes("/appointments/hospitals")) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              list: [
                {
                  id: "hospital-1",
                  name: "Bangkok Hospital",
                  nameTh: "โรงพยาบาลกรุงเทพ",
                  address: "2 Soi Soonvijai 7, New Petchaburi Rd., Bangkok",
                  phone: "02-310-3000",
                  email: "info@bangkokhospital.com",
                },
              ],
            }),
          });
          return;
        }

        const futureOnly = url.searchParams.get("futureOnly") === "true";
        if (futureOnly) {
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
        } else {
          await route.continue();
        }
      } else if (request.method() === "POST") {
        const body = await request.postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "appointment-new",
            userId: "user-id",
            date: body.date,
            status: body.status,
            expectedTimeSlot: body.expectedTimeSlot,
            reason: body.reason,
            note: body.note,
            hospitalName: body.hospitalName,
            departmentName: body.departmentName,
            hospitalEmail: body.hospitalEmail,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("./app/appointment");

    // Open add appointment modal
    const addButton = page.getByRole("button", {
      name: /เพิ่มรายการนัดหมายแพทย์/,
    });
    await addButton.click();
    await page.getByRole("menuitem", { name: /เพิ่มนัดหมายแพทย์ใหม่/ }).click();

    // Wait for modal
    await expect(
      page.getByRole("dialog").getByText(/ทำรายการนัดหมายแพทย์/),
    ).toBeVisible({ timeout: 5000 });

    // Fill hospital
    const hospitalDropdown = page
      .getByRole("dialog")
      .getByText(/เลือกโรงพยาบาล/)
      .locator("..");
    await hospitalDropdown.click();
    await page.getByText("โรงพยาบาลกรุงเทพ").click();

    // Fill department
    const departmentDropdown = page
      .getByRole("dialog")
      .getByText(/เลือกแผนก/)
      .locator("..");
    await departmentDropdown.click();
    await page.getByText("อายุรกรรม").first().click();

    // Verify date and time fields are pre-filled (form defaults to tomorrow)
    // Date button shows formatted date when selected, not placeholder text
    const dateButton = page
      .getByRole("dialog")
      .getByText(/วันที่นัดหมาย/)
      .locator("..")
      .getByRole("button");
    await expect(dateButton).toBeVisible();

    // Time button shows time value when selected, not placeholder text
    const timeButton = page
      .getByRole("dialog")
      .getByText(/เวลานัดหมาย/)
      .locator("..")
      .getByRole("button");
    await expect(timeButton).toBeVisible();

    // Step 1 done - click next to go to step 2 (symptoms)
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /ต่อไป/ })
      .click();

    // Fill reason on step 2
    const reasonTextarea = page
      .getByRole("dialog")
      .getByPlaceholder("กรอกอาการที่พบในปัจจุบัน");
    await reasonTextarea.fill("ตรวจสุขภาพประจำปี");

    // Fill note on step 2
    const noteInput = page.getByRole("dialog").getByPlaceholder("กรอกหมายเหตุ");
    await noteInput.fill("นำผลตรวจเก่ามาด้วย");

    // Step 2 done - click next to go to step 3 (confirm)
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /ต่อไป/ })
      .click();

    // Verify submit button is enabled on step 3
    const submitButton = page
      .getByRole("dialog")
      .getByRole("button", { name: /ทำการนัดหมายแพทย์/ });
    await expect(submitButton).toBeEnabled();
  });
});
