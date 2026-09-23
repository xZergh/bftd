import { expect, test } from "@playwright/test";
import { DEMO, demoProjectIdFromPage, openDemoRequirements } from "./fixtures/demo-qa";

// Verifies the readability pass on prose fields (requirement description, manual steps) and
// captures screenshots so the change can be reviewed visually.
//
// The assertions are the point; the screenshots are evidence. Both target the case that was
// broken: multi-line content that previously rendered in a browser-default control font at a
// mismatched size, inside a fixed-height box with no wrapping.

test.describe.configure({ mode: "serial" });

// A realistic multi-line description in the shape our Figma importer produces.
const MULTILINE_DESCRIPTION = [
  'Design source: Figma section 4342:9242 — "Timeline".',
  "Variants in design: Type=Goal, Type=Shot, Type=Goal by given player.",
  "Acceptance criteria pending review — derived from design structure, not from stated intent."
].join("\n");

const LONG_EXPECTED =
  "Layout, labels, and spacing match the linked Figma node, including the game-strength lane " +
  "and the stoppage marker at the correct offset — TODO confirm with designer";

test.describe("FE-O prose readability", () => {
  test("requirement description: aligned type, body leading, newlines preserved", async ({ page }) => {
    await openDemoRequirements(page);

    const reqRow = page.locator(`tr[data-requirement-key="${DEMO.requirements.R3}"]`);
    await expect(reqRow).toBeVisible();
    await reqRow.getByTestId("requirement-open").click();
    await expect(page.getByTestId("requirement-detail-page")).toBeVisible();

    const description = page.getByTestId("requirement-edit-description");
    await expect(description).toBeVisible();

    // It must be a textarea, not an input — an input cannot wrap.
    expect(await description.evaluate((el) => el.tagName)).toBe("TEXTAREA");

    await description.fill(MULTILINE_DESCRIPTION);

    // While the draft diverges, the saved version is shown as wrapped prose. This is the
    // only place stored newlines render outside a form control.
    const readout = page.getByTestId("requirement-description-readout");
    await expect(readout).toBeVisible();
    expect(await readout.evaluate((el) => window.getComputedStyle(el).whiteSpace)).toBe("pre-wrap");

    await expect(page.getByTestId("form-save-status")).toHaveAttribute("data-save-state", "saved", {
      timeout: 8000
    });

    // Once saved, draft === stored, so the readout retires instead of duplicating the field.
    await expect(readout).toBeHidden();

    // Typography: the control must match the prose around it, not the browser's default
    // control font. Compared against the enclosing container rather than a literal stack,
    // so the assertion survives a font-stack change.
    const typography = await description.evaluate((el) => {
      const s = window.getComputedStyle(el);
      const container = el.closest(".projects-create-fields") ?? el.parentElement!;
      return {
        fontSize: parseFloat(s.fontSize),
        lineHeight: parseFloat(s.lineHeight),
        fontFamily: s.fontFamily,
        bodyFontFamily: window.getComputedStyle(container).fontFamily
      };
    });
    // 0.875rem === 14px at the default root size.
    expect(typography.fontSize).toBeCloseTo(14, 1);
    // Body leading (1.5 * 14 = 21), not the browser's cramped ~1.2 default.
    expect(typography.lineHeight).toBeCloseTo(21, 1);
    expect(typography.fontFamily).toBe(typography.bodyFontFamily);

    // Auto-grow: the field must show all three lines without an inner scrollbar.
    const grown = await description.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight
    }));
    expect(grown.clientHeight).toBeGreaterThanOrEqual(grown.scrollHeight - 2);

    await page.screenshot({
      path: "artifacts/screenshots/requirement-description-readability.png",
      fullPage: true
    });
  });

  test("manual steps: expected result wraps and columns align", async ({ page }) => {
    const projectId = await demoProjectIdFromPage(page);
    await page.goto(`/projects/${projectId}/test-cases`);

    await page.getByText(DEMO.manualTitles.login, { exact: false }).first().click();
    await expect(page.getByTestId("testcase-manual-steps")).toBeVisible();

    const expected0 = page.getByTestId("testcase-edit-step-expected-0");
    await expect(expected0).toBeVisible();

    // The core fix: this was <input type="text">, which cannot wrap long expected results.
    expect(await expected0.evaluate((el) => el.tagName)).toBe("TEXTAREA");

    await expected0.fill(LONG_EXPECTED);

    // Long content wraps to multiple lines instead of scrolling horizontally.
    const wrapped = await expected0.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return {
        clientHeight: el.clientHeight,
        lineHeight: parseFloat(s.lineHeight),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        fontSize: parseFloat(s.fontSize)
      };
    });
    expect(wrapped.clientHeight).toBeGreaterThan(wrapped.lineHeight * 1.5);
    expect(wrapped.scrollWidth).toBeLessThanOrEqual(wrapped.clientWidth + 1);
    expect(wrapped.fontSize).toBeCloseTo(14, 1);

    // Step name and Expected must share one type scale (they previously did not).
    const nameFontSize = await page
      .getByTestId("testcase-edit-step-name-0")
      .evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
    expect(nameFontSize).toBeCloseTo(wrapped.fontSize, 1);

    // Grid alignment: every step's Expected column starts at the same x offset.
    const lefts = await page
      .locator('[data-testid^="testcase-edit-step-expected-"]')
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));
    expect(new Set(lefts).size).toBe(1);

    await page.screenshot({
      path: "artifacts/screenshots/manual-steps-readability.png",
      fullPage: true
    });
  });
});

test.describe("FE-O requirements row selection", () => {
  test("clicking a requirement row opens the inspector sidebar", async ({ page }) => {
    await openDemoRequirements(page);

    const reqRow = page.locator(`tr[data-requirement-key="${DEMO.requirements.R2}"]`);
    await expect(reqRow).toBeVisible();

    // Click cell whitespace (the title cell, away from its inline input). Previously every
    // cell called stopPropagation unconditionally, so the row never selected.
    await reqRow.locator('td[data-column="title"]').click({ position: { x: 2, y: 2 } });

    await expect(page.getByTestId("requirement-inspector-close")).toBeVisible();
    await expect(reqRow).toHaveClass(/projects-table-row--selected/);
    await expect(page).toHaveURL(/[?&]req=/);

    // Editing an inline control must still NOT change selection away from the row.
    const titleInput = reqRow.locator('td[data-column="title"] input').first();
    if (await titleInput.count() > 0) {
      await titleInput.click();
      await expect(page.getByTestId("requirement-inspector-close")).toBeVisible();
    }

    await page.screenshot({
      path: "artifacts/screenshots/requirements-sidebar-open.png",
      fullPage: true
    });
  });
});

test.describe("FE-O testcase status + link counts", () => {
  test("status column is inline-editable and persists", async ({ page }) => {
    const projectId = await demoProjectIdFromPage(page);
    await page.goto(`/projects/${projectId}/test-cases`);

    const row = page.locator("tr[data-testcase-id]").first();
    await expect(row).toBeVisible();
    const tcId = await row.getAttribute("data-testcase-id");

    const statusSelect = page.getByTestId(`testcase-row-status-${tcId}`);
    await expect(statusSelect).toBeVisible();
    // Real status, distinct from the active/deleted lifecycle column beside it.
    await expect(statusSelect).toHaveValue(/draft|ready|deprecated/);

    await statusSelect.selectOption("ready");
    await expect(statusSelect).toHaveValue("ready");

    // Survives a reload, i.e. it was actually written, not just local state.
    await page.reload();
    await expect(page.getByTestId(`testcase-row-status-${tcId}`)).toHaveValue("ready");

    // The lifecycle column still reports active — status did not hijack it.
    await expect(row).toContainText("active");

    await page.screenshot({ path: "artifacts/screenshots/testcase-status-editable.png", fullPage: true });
  });

  test("link count opens the row inspector instead of rendering a bare number", async ({ page }) => {
    const projectId = await demoProjectIdFromPage(page);
    await page.goto(`/projects/${projectId}/test-cases`);

    const countButton = page.locator('[data-testid^="testcase-links-open-"]').first();
    await expect(countButton).toBeVisible();
    await expect(countButton).toHaveText(/^[1-9]\d*$/);

    await countButton.click();
    await expect(page).toHaveURL(/[?&]tc=/);
    // Assert the inspector itself, not a manual-only section — the first row may be an
    // automated case, which has no steps/linked-requirements panel.
    await expect(page.getByTestId("testcase-inspector-close")).toBeVisible();
    await expect(page.getByTestId("testcase-detail-page")).toBeVisible();
  });
});

test.describe("FE-O requirement link counts", () => {
  test("Linked TC count opens the requirement inspector", async ({ page }) => {
    await openDemoRequirements(page);

    const countButton = page.locator('[data-testid^="requirement-links-open-"]').first();
    await expect(countButton).toBeVisible();
    await expect(countButton).toHaveText(/^[1-9]\d*$/);

    await countButton.click();
    await expect(page.getByTestId("requirement-inspector-close")).toBeVisible();
    await expect(page).toHaveURL(/[?&]req=/);
  });
});

test.describe("FE-O hierarchy subtree filter", () => {
  test("selecting a root scopes the requirements table to its subtree", async ({ page }) => {
    await openDemoRequirements(page);

    const filter = page.getByTestId("requirement-tree-filter");
    await expect(filter).toBeVisible();

    // Wait for rows to actually render before counting; count() does not retry.
    const rowLocator = page.locator("tr[data-requirement-key]");
    await expect.poll(async () => await rowLocator.count(), { timeout: 10000 }).toBeGreaterThan(1);
    const allRows = await rowLocator.count();

    // Pick a requirement that has children so the subtree is a strict, non-trivial subset.
    const options = await filter.locator("option").evaluateAll((els) =>
      els.map((el) => ({ value: (el as HTMLOptionElement).value, label: el.textContent ?? "" }))
    );
    // DEMO-FT-01-01 has a 3-node subtree (root + 2 children) in the DEMO-QA seed.
    const target = options.find((o) => o.value !== "" && o.label.includes("DEMO-FT-01-01"));
    expect(target).toBeTruthy();

    await filter.selectOption(target!.value);
    await expect(page).toHaveURL(/[?&]tree=/);

    // Poll: the URL updates before React re-renders the filtered table.
    await expect
      .poll(async () => await rowLocator.count(), { timeout: 10000 })
      .toBeLessThan(allRows);
    const scopedRows = await rowLocator.count();
    expect(scopedRows).toBe(3);

    await page.screenshot({ path: "artifacts/screenshots/requirements-hierarchy-filter.png", fullPage: true });

    // Resetting restores the full table — you can always escape the filter.
    await filter.selectOption("");
    await expect(rowLocator).toHaveCount(allRows);
  });
});
