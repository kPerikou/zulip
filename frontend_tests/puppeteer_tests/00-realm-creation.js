const puppeteer = require("puppeteer");
const assert = require("assert");

const email = 'alice@test.example.com';
const subdomain = 'testsubdomain';
const organization_name = 'Awesome Organization';
const host = "zulipdev.com:9981";

async function run() {
    const browser = await puppeteer.launch({
        args: [
            '--window-size=1400,1024',
            '--no-sandbox', '--disable-setuid-sandbox',
        ],
        defaultViewport: null,
        headless: true,
    });
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 1024 });
        await page.goto('http://' + host + '/new/');
        // submit the email for realm creation.
        await page.waitForSelector('#email');
        await page.type('#email', email);
        await page.$eval('#send_confirm', form => form.submit());
        // Make sure onfirmation email is sent.
        assert(page.url().includes('/accounts/new/send_confirm/' + email));

        // Special endpoint enabled only during tests for extracting confirmation key
        await page.goto('http://' + host + '/confirmation_key/');

        // Open the confirmation URL
        const page_content = await page.evaluate(() => document.querySelector('body').innerText);
        const confirmation_key = await JSON.parse(page_content).confirmation_key;
        const confirmation_url = 'http://' + host + '/accounts/do_confirm/' + confirmation_key;
        await page.goto(confirmation_url);
        await page.$eval('#register', form => form.submit());

        // Make sure the realm creation page is loaded correctly by
        // checking the text in <p> tag under pitch class is as expected.
        await page.waitForSelector('.pitch');
        const text_in_pitch = await page.evaluate(() => document.querySelector('.pitch p').innerText);
        assert(text_in_pitch === "We just need you to do one last thing.");

        // fill the form.
        await page.type('#id_team_name', organization_name);
        await page.type('#id_full_name', 'Alice');
        await page.type('#id_team_subdomain', subdomain);
        await page.type('#id_password', 'passwordwhichisnotreallycomplex');
        await page.click('#id_terms');
        await page.$eval('#registration', form => form.submit());

        // Check if realm is created and user is logged in by checking if
        // element of id `lightbox_overlay` exists.
        await page.waitForSelector('#lightbox_overlay');  // if element doesn't exist,timeout error raises.
    } catch (e) {
        console.log(e);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

run();
