// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('TMSA Scientists Regression Suite', () => {

    test.beforeEach(async ({ page }) => {
        // Go to the app
        await page.goto('file:///c:/Users/satic/.gemini/antigravity/playground/tmsa-scientists/index.html');

        // MOCK DATA to bypass CORS/File protocol restrictions for fetch
        await page.evaluate(() => {
            window.pedagogyData = {
                grades: [
                    { id: '5', title: '5th Grade', strands: [] },
                    { id: '8', title: '8th Grade', strands: [] },
                    { id: 'Biology', title: 'Biology', strands: [] }
                ]
            };

            window.studentRoster = [
                { username: 'ali.yilmaz', password: '123', name: 'Ali Yilmaz', school: 'Apex' }
            ];

            // Mock fbManager to avoid cloud checks
            window.fbManager = {
                isReady: true,
                loginStudent: async () => null, // Cloud fail, fall through to local
                registerStudent: async () => true,
                getJournalEntries: async () => [],
                saveJournalEntry: async () => true,
                getActivityLogs: async () => [],
                logActivity: async () => true
            };
        });
    });

    test('Login Flow -> Unified Dashboard', async ({ page }) => {
        // 1. Check Login Page Visibility
        await expect(page.locator('#login-section')).toBeVisible();

        // 2. Fill Credentials
        await page.fill('#username-input', 'ali.yilmaz');
        await page.fill('#password-input', '123');

        // 3. Select Grade (Critical Step)
        await page.selectOption('#login-grade-select', '8');

        // 4. Click Login
        await page.click('#login-btn');

        // 5. Assert Dashboard Visible
        await expect(page.locator('#main-dashboard')).toBeVisible();
        await expect(page.locator('#main-dashboard')).toHaveCSS('display', 'flex');

        // 6. Assert "Start Session" Button Exists
        await expect(page.getByText('Start Session')).toBeVisible();
        await expect(page.getByText('My Stats')).toBeVisible();
        await expect(page.getByText('Lab Journal')).toBeVisible();

        // 7. Assert Overlaps are GONE (Back menu hidden)
        await expect(page.locator('#app-sidebar')).not.toBeVisible();
        await expect(page.locator('.chat-area')).not.toBeVisible();
    });

    test('Navigation: Dashboard -> Chat -> Back', async ({ page }) => {
        // Login First (Helper)
        await page.fill('#username-input', 'ali.yilmaz');
        await page.fill('#password-input', '123');
        await page.selectOption('#login-grade-select', '8');
        await page.click('#login-btn');

        // Click Start Session
        await page.click('text=Start Session');

        // Assert Chat Area Visible
        await expect(page.locator('.chat-area')).toBeVisible();

        // Assert Back Button Visible
        const backBtn = page.locator('#global-back-btn');
        await expect(backBtn).toBeVisible();

        // Click Back
        await backBtn.click();

        // Assert Dashboard Visible Again
        await expect(page.locator('#main-dashboard')).toBeVisible();

        // Assert Chat Hidden
        await expect(page.locator('.chat-area')).not.toBeVisible();
    });

    test('UI Polish: Stats Modal', async ({ page }) => {
        // Login
        await page.fill('#username-input', 'ali.yilmaz');
        await page.fill('#password-input', '123');
        await page.selectOption('#login-grade-select', '8');
        await page.click('#login-btn');

        // Open Stats
        await page.click('text=My Stats');

        // Assert Overlay Visible
        await expect(page.locator('#progress-overlay')).toBeVisible();

        // Assert Close Button (Back)
        await page.click('text=Close ❌');

        // Assert Overlay Gone
        await expect(page.locator('#progress-overlay')).not.toBeVisible();
    });

});
