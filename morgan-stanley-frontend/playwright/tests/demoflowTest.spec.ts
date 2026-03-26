import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/trades');
  
  await expect(page).toHaveURL(/trades/);

  // const resultsSpan = page.locator('span.text-xs.font-mono.bg-black\\/5');
  const resultsSpan = page.locator('span:has-text("trades")');

  if (await resultsSpan.count() === 0) {
    test.skip(true, 'Trade count element not found');
    console.log("Trade count element not found")
  }
  await expect(resultsSpan).toHaveText(/\d+ trades/, { timeout: 10000 });

  const spanText = await resultsSpan.textContent();
  const resultsCount = parseInt(spanText?.match(/\d+/)?.[0] || '0', 10);

  if(resultsCount == 0){
    test.skip(true, 'No trade found');
    console.log("No trade found")
  }
});


test.skip('Trade status consistency', async ({ page }) => {
  const resultsSpan = page.locator('span.text-xs.font-mono.bg-black\\/5');

  await expect(resultsSpan).toHaveText(/\d+ trades/, { timeout: 10000 });

  const spanText = await resultsSpan.textContent();
  const resultsCount = parseInt(spanText?.match(/\d+/)?.[0] || '0', 10);

  expect(resultsCount).toBeGreaterThan(0);

  const statusSpan = page.locator('span[data-slot="badge"]').first();
  const status = await statusSpan.textContent()

  await statusSpan.click()
  const statusSpanTradePage = page.locator('span[data-slot="badge"]').first();
  const statusTradePage = await statusSpanTradePage.textContent()

  expect(status).not.toBeNull();
  expect(statusTradePage).not.toBeNull();
  expect(status?.trim()).toBe(statusTradePage?.trim());

  await page.getByRole('tab', { name: 'Timeline Flow' }).click();
  const lastStatus = await page.locator('span[data-slot="badge"]').last().textContent();

  expect(lastStatus).not.toBeNull()
  expect(status?.trim()).toBe(lastStatus?.trim())
  // console.log(lastStatus)

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL('/trades');
  await expect(page.getByText('Manual Search')).toBeVisible();
});
test('Manual search by tradeId', async ({ page }) => {
  const trade = page.locator('span[class="text-sm text-black"]').first()
  const tradeId = await trade.textContent()
  expect(tradeId).not.toBeNull()

  await page.getByText("Manual Search").click()
  const input = page.getByPlaceholder('Enter trade ID...');

  // await page.pause()
  await input.fill(tradeId||"");
  await page.getByRole('button', { name: 'Search' }).nth(3).click();
  await page.waitForTimeout(2000)

  const tradesResults = await page.locator('span', {
    hasText: /\d+\s+trades/
  }).textContent();

  console.log("tradesResuts debug: ",tradesResults)
  const count = parseInt(tradesResults ?? '0', 10);
  // console.log(count)
  expect(count).toBe(1)
  const trade2 = page.locator('span[class="text-sm text-black"]').first()
  const tradeId2 = await trade2.textContent()
  expect(tradeId2).not.toBeNull()
  expect(tradeId?.trim()).toBe(tradeId2?.trim())
});
test('AI search - cleared search in 2025', async ({ page }) => {
  await page.getByPlaceholder(/Search by trade ID/i).fill('All cleared trade in 2025');
  await page.click('button[title="Search"]');

  await page.waitForTimeout(2000); 
  // await page.pause()
  // await page.getByRole('button', { name: 'Seach' }).click();

  // await page.pause()

  // await page.waitForSelector('tr[data-slot="table-row"]');

  const tbody = page.locator('tbody[data-slot="table-body"]');
  await tbody.waitFor(); 
  await page.waitForTimeout(2000); 
  const rows = tbody.locator('tr[data-slot="table-row"]');;

  await page.waitForTimeout(2000); 
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);

    await row.scrollIntoViewIfNeeded();

    const date1 = await row.locator('td').nth(6).innerText();
    const date2 = await row.locator('td').nth(7).innerText();
    const status = await row.locator('td').nth(8).innerText();

    expect(date1).toContain('2025')
    expect(date2).toContain('2025')
    expect(status.trim()).toBe('CLEARED');
  }
});
test('Exception - view all exceptions', async ({ page }) => { 
  const exceptionsLink = page.locator('a', { hasText: 'Exceptions' });
  await exceptionsLink.click();
  await expect(page).toHaveURL(/exceptions/);
  await page.waitForTimeout(2000)

  const exceptionsText = await page.locator('span:has-text("exceptions")').nth(2).innerText();

  const match = exceptionsText.match(/\d+/);
  const exceptionsCount = match ? parseInt(match[0], 10) : 0;
  if(exceptionsCount == 0){
    console.error("No exception found")
  }

  const tbody = page.locator('tbody[data-slot="table-body"]');
  const rows = tbody.locator('tr[data-slot="table-row"]');
  const count = await rows.count()

  for (let i = 0; i< count; i++){
    const row = rows.nth(i);
    await row.scrollIntoViewIfNeeded();
    const status = await row.locator('td').nth(3).innerText()

    if(status.trim() == "CLOSED"){
      await row.click()
      break;
    }
  }
  await page.getByText("View Solution").click()
  // await page.pause()
  await page.waitForTimeout(3000)
  const card = page.locator('div[data-slot="card-content"]');

  const solutionId = await card.locator('p:has-text("Solution ID") + p').first().innerText();
  const exceptionId = await card.locator('p:has-text("Exception ID") + p').first().innerText();
  const title = await card.locator('p:has-text("Title") + p').first().innerText();
  const exceptionDesc = await card.locator('p:has-text("Exception Description") + p').first().innerText();
  const referenceEvent = await card.locator('p:has-text("Reference Event") + p').first().innerText();
  const solutionDesc = await card.locator('p:has-text("Solution Description") + p').first().innerText();
  const createdTime = await card.locator('p:has-text("Created Time") + p').first().innerText();
  expect(solutionId).not.toBe('');
  expect(exceptionId).not.toBe('');
  expect(title).not.toBe('');
  expect(exceptionDesc).not.toBe('');
  expect(referenceEvent).not.toBe('');
  expect(solutionDesc).not.toBe('');
  expect(createdTime).not.toBe('');
});


// test('Exception - view all exceptions', async ({ page }) => { });

test('Exception - view associated trade', async ({ page }) => {
  await page.getByRole('link', { name: 'Exceptions' }).click();
  await page.waitForTimeout(2000)

  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Pending' }).click();

  const card = page.locator('div[data-slot="card-content"]');
  const pendingExceptionsText = await card.locator('div.text-3xl').first().innerText();
  const pendingExceptions = parseInt(pendingExceptionsText, 10);

  // console.log(`Pending Exceptions: ${pendingExceptions}`);
  const resultsSpan = page.locator('span.text-xs.font-mono.bg-black\\/5');
  const spanText = await resultsSpan.textContent();
  const resultsCount = parseInt(spanText?.match(/\d+/)?.[0] || '0', 10);

  expect(resultsCount).toBe(pendingExceptions)
  if(resultsCount > 0){
    await page.waitForTimeout(2000)
    const tbody = page.locator('tbody[data-slot="table-body"]');
    const rows = tbody.locator('tr[data-slot="table-row"]');
    await rows.first().click()
    await page.getByRole('button', { name: 'View Associated Trade' }).click();
    await page.waitForTimeout(2000)
    const exceptionsNumber = parseInt(await page.locator('div:has-text("Exceptions") p.text-lg').nth(1).innerText());
    expect(exceptionsNumber).toBeGreaterThan(0)
  }
});

test('Exception - Create solution', async ({ page }) => {
  await page.getByRole('link', { name: 'Exceptions' }).click();
  await page.waitForTimeout(2000)
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Pending' }).click();

  const resultsSpan = page.locator('span.text-xs.font-mono.bg-black\\/5');
  const spanText = await resultsSpan.textContent();
  const resultsCount = parseInt(spanText?.match(/\d+/)?.[0] || '0', 10);

  if(resultsCount > 0){
    await page.waitForTimeout(2000)
    const tbody = page.locator('tbody[data-slot="table-body"]');
    const rows = tbody.locator('tr[data-slot="table-row"]');
    await rows.first().click()
    await page.getByRole('button', { name: 'View Exception' }).click();
    const description = await page.locator('div[data-slot="card-description"]').innerText();
    expect(description).not.toBeNull()

    const loadingText = page.locator('text=AI is analyzing the exception...');
    await expect(loadingText).toHaveCount(0, { timeout: 30000});
    const matchBadge = page.locator('span[data-slot="badge"]', { hasText: 'Match' });

    const text = await matchBadge.first().innerText();
    expect(text).not.toBeNull()
    expect(text).not.toBe("")


    await page.getByRole('tab', { name: "Create New Solution with AI"}).click()

    // await page.pause()
    await page.getByRole('button', { name: "Generate Solution Description"}).click()
    const generatingBtn = page.locator('button:has-text("Generating...")');
    await expect(generatingBtn).toHaveCount(0, { timeout: 30000});

    const solDesc = await page.getByRole('textbox', { name: 'Solution Description' }).textContent();
    expect(solDesc).toBe("")

    await page.getByRole("button", { name: "Copy to Description"}).click()

    const solDescAfter = await page.getByRole('textbox', { name: 'Solution Description' }).textContent();
    expect(solDescAfter).not.toBeNull()
    expect(solDescAfter?.trim().length).toBeGreaterThan(0)
  }
});
