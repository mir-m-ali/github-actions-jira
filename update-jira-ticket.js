const DOMAIN = `mirmali.atlassian.net`;
const EMAIL = `mir.ali1016@gmail.com`;
const AUTH = Buffer.from(`${EMAIL}:${process.env.JIRA_API_TOKEN}`).toString(
  "base64",
);
const BASE_URL = `https://${DOMAIN}/rest/api/3/issue/`;

async function getJiraIssueDetails(jiraId) {
  try {
    const response = await fetch(
      `${BASE_URL}${jiraId}?fields=customfield_10121,customfield_10122`,
      {
        method: `GET`,
        headers: {
          Authorization: `Basic ${AUTH}`,
          Accept: `application/json`,
        },
      },
    );

    if (!response.ok)
      throw new Error(
        `Failed to fetch JIRA issue details: ${response.status} ${response.statusText}`,
      );

    return await response.json();
  } catch (error) {
    throw new Error(error);
  }
}

async function updateJiraIssue(jiraId, totalHours, totalUpdates) {
  try {
    const response = await fetch(`${BASE_URL}${jiraId}`, {
      method: `PUT`,
      headers: {
        Authorization: `Basic ${AUTH}`,
        Accept: `application/json`,
        "Content-Type": `application/json`,
      },
      body: JSON.stringify({
        fields: {
          customfield_10121: totalHours,
          customfield_10122: totalUpdates,
          customfield_10123: [new Date().toISOString()],
        },
      }),
    });

    if (response.status !== 204)
      throw new Error(
        `Error update JIRA issue: ${response.status} ${await response.text()}`,
      );

    console.log(`Successfully update JIRA issue ${jiraId}`);
  } catch (error) {
    throw new Error(error);
  }
}

(async () => {
  try {
    let commitMessage = process.argv[2];
    let parts = commitMessage.split(`::`);
    if (parts.length < 3) {
      console.log(`
                    Commit message was not in expected format to update JIRA ticket. Correct usage is:\n
                    JIRA-ID::hours worked on ticket:: description of work done\n
                    Example: PPQT-123::5:: Fixed the login bug
                    `);
      return;
    }

    let jiraId = parts[0].trim();
    let hoursWorked = parseInt(parts[1].trim());
    let jiraIssueDetails = await getJiraIssueDetails(jiraId);

    // customfield_10121 = total hours worked so far on the ticket
    // customfield_10122 = number of times the ticket was worked on

    let getValue = (value) =>
      value === null || value === undefined ? 0 : parseInt(value);

    let totalHours =
      getValue(jiraIssueDetails.fields.customfield_10121) + hoursWorked;
    let totalUpdates = getValue(jiraIssueDetails.fields.customfield_10122) + 1;

    await updateJiraIssue(jiraId, totalHours, totalUpdates);
  } catch (error) {
    console.error(error);
  }
})();
