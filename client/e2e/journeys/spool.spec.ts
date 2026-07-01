import { APP_BASE_URL } from "../constants";
import { expect, test } from "../fixtures";
import { atPath, saveAndGetId, saveButton } from "../helpers";

// Spool journey. A filament is seeded through the API so the UI test focuses on the
// spool create form (searchable filament Select + weight entry), show, edit, adjust
// and archive.

async function seedFilament(
  request: import("@playwright/test").APIRequestContext,
): Promise<{ id: number; name: string }> {
  const name = `Seed ${Date.now()}`;
  const res = await request.post(`${APP_BASE_URL}/api/v1/filament`, {
    data: { name, density: 1.24, diameter: 1.75, weight: 1000 },
  });
  expect(res.ok()).toBeTruthy();
  return { id: (await res.json()).id, name };
}

test.describe("spool journey", () => {
  test("create (select filament) → show → edit", async ({ page, request }) => {
    const filament = await seedFilament(request);

    await page.goto(`${APP_BASE_URL}/spool/create`);
    await expect(page).toHaveURL(atPath("/spool/create"));

    // Searchable filament Select: open, type the seeded name, pick the antd option.
    const filamentSelect = page.getByLabel("Filament");
    await filamentSelect.click();
    await filamentSelect.pressSequentially(filament.name);
    await page.locator(".ant-select-item-option").filter({ hasText: filament.name }).first().click();

    // used_weight defaults to 0 and initial_weight auto-fills from the filament, so a
    // comment is enough to make an identifiable, editable spool.
    await page.getByLabel("Comment").fill("e2e spool");

    const id = await saveAndGetId(page, "spool");
    await expect(page).toHaveURL(atPath("/spool"));

    // Show — the linked filament name is rendered
    await page.goto(`${APP_BASE_URL}/spool/show/${id}`);
    await expect(page.getByText(filament.name, { exact: false }).first()).toBeVisible();

    // Edit → change the comment
    await page.getByRole("button", { name: "Edit" }).first().click();
    await expect(page).toHaveURL(atPath(`/spool/edit/${id}`));
    await page.getByLabel("Comment").fill("e2e spool edited");
    await saveButton(page).click();
    await expect(page).toHaveURL(atPath("/spool"));
  });
});
