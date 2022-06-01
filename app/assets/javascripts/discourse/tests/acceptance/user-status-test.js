import {
  acceptance,
  exists,
  publishToMessageBus,
  query,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import { click, fillIn, visit } from "@ember/test-helpers";
import { test } from "qunit";

async function openUserStatusModal() {
  await click(".header-dropdown-toggle.current-user");
  await click(".menu-links-row .user-preferences-link");
  await click(".user-status button");
}

async function pickEmoji(emoji) {
  await click(".btn-emoji");
  await fillIn(".emoji-picker-content .filter", emoji);
  await click(".results .emoji");
}

acceptance("User Status", function (needs) {
  const userStatus = "off to dentist";
  const userStatusEmoji = "tooth";
  const userId = 1;

  needs.user({ id: userId });

  needs.pretender((server, helper) => {
    server.put("/user-status.json", () => {
      publishToMessageBus(`/user-status/${userId}`, {
        description: userStatus,
      });
      return helper.response({ success: true });
    });
    server.delete("/user-status.json", () => {
      publishToMessageBus(`/user-status/${userId}`, null);
      return helper.response({ success: true });
    });
  });

  test("doesn't show the user status button on the menu by default", async function (assert) {
    this.siteSettings.enable_user_status = false;

    await visit("/");
    await click(".header-dropdown-toggle.current-user");
    await click(".menu-links-row .user-preferences-link");

    assert.notOk(exists("div.quick-access-panel li.user-status"));
  });

  test("shows the user status button on the menu when disabled in settings", async function (assert) {
    this.siteSettings.enable_user_status = true;

    await visit("/");
    await click(".header-dropdown-toggle.current-user");
    await click(".menu-links-row .user-preferences-link");

    assert.ok(
      exists("div.quick-access-panel li.user-status"),
      "shows the button"
    );
    assert.ok(
      exists("div.quick-access-panel li.user-status svg.d-icon-plus-circle"),
      "shows the icon on the button"
    );
  });

  test("shows user status on loaded page", async function (assert) {
    this.siteSettings.enable_user_status = true;
    updateCurrentUser({
      status: { description: userStatus, emoji: userStatusEmoji },
    });

    await visit("/");
    await click(".header-dropdown-toggle.current-user");
    await click(".menu-links-row .user-preferences-link");

    assert.equal(
      query("div.quick-access-panel li.user-status span.d-button-label")
        .innerText,
      userStatus,
      "shows user status description on the menu"
    );

    assert.equal(
      query("div.quick-access-panel li.user-status img.emoji").alt,
      `:${userStatusEmoji}:`,
      "shows user status emoji on the menu"
    );

    assert.equal(
      query(".header-dropdown-toggle .user-status-background img.emoji").alt,
      `:${userStatusEmoji}:`,
      "shows user status emoji on the user avatar in the header"
    );
  });

  test("emoji picking", async function (assert) {
    this.siteSettings.enable_user_status = true;

    const defaultStatusEmoji = "mega";
    const emoji = "palm_tree";

    await visit("/");
    await openUserStatusModal();

    assert.ok(
      exists(`.btn-emoji .d-icon-${defaultStatusEmoji}`),
      "default status emoji is shown"
    );

    await click(".btn-emoji");
    assert.ok(exists(".emoji-picker.opened"), "emoji picker is opened");

    await fillIn(".emoji-picker-content .filter", emoji);
    await click(".results .emoji");
    assert.ok(
      exists(`.btn-emoji .d-icon-${emoji}`),
      "chosen status emoji is shown"
    );
  });

  test("setting user status", async function (assert) {
    this.siteSettings.enable_user_status = true;

    await visit("/");
    await openUserStatusModal();

    await fillIn(".user-status-description", userStatus);
    await pickEmoji(userStatusEmoji);
    await click(".btn-primary");

    assert.equal(
      query(".header-dropdown-toggle .user-status-background img.emoji").alt,
      `:${userStatusEmoji}:`,
      "shows user status emoji on the user avatar in the header"
    );

    await click(".header-dropdown-toggle.current-user");
    await click(".menu-links-row .user-preferences-link");
    assert.equal(
      query("div.quick-access-panel li.user-status span.d-button-label")
        .innerText,
      userStatus,
      "shows user status description on the menu"
    );

    assert.equal(
      query("div.quick-access-panel li.user-status img.emoji").alt,
      `:${userStatusEmoji}:`,
      "shows user status emoji on the menu"
    );
  });

  test("updating user status", async function (assert) {
    this.siteSettings.enable_user_status = true;
    updateCurrentUser({ status: { description: userStatus } });
    const updatedStatus = "off to dentist the second time";

    await visit("/");
    await openUserStatusModal();

    await fillIn(".user-status-description", updatedStatus);
    await click(".btn-primary");

    await click(".header-dropdown-toggle.current-user");
    await click(".menu-links-row .user-preferences-link");
    assert.equal(
      query("div.quick-access-panel li.user-status span.d-button-label")
        .innerText,
      updatedStatus,
      "shows user status description on the menu"
    );
  });

  test("clearing user status", async function (assert) {
    this.siteSettings.enable_user_status = true;
    updateCurrentUser({ status: { description: userStatus } });

    await visit("/");
    await openUserStatusModal();
    await click(".btn.delete-status");

    assert.notOk(exists(".header-dropdown-toggle .user-status-background"));
  });

  test("shows the trash button when editing status that was set before", async function (assert) {
    this.siteSettings.enable_user_status = true;
    updateCurrentUser({ status: { description: userStatus } });

    await visit("/");
    await openUserStatusModal();

    assert.ok(exists(".btn.delete-status"));
  });

  test("doesn't show the trash button when status wasn't set before", async function (assert) {
    this.siteSettings.enable_user_status = true;
    updateCurrentUser({ status: null });

    await visit("/");
    await openUserStatusModal();

    assert.notOk(exists(".btn.delete-status"));
  });
});
