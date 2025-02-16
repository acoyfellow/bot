const mainRef = await fetch(
  "https://api.github.com/repos/acoyfellow/bot/git/refs/heads/main",
  {
    headers: {
      "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    }
  }
);
console.log({ mainRef });
const mainRefData = await mainRef.json();
console.log({ mainRefData });
const { object: { sha } } = mainRefData;
console.log({ sha });
