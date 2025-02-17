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

if (mainRef.ok) {
  const mainRefData = await mainRef.json();
  const { object: { sha } } = mainRefData;
  console.log({ sha });
} else {
  console.error('Failed to fetch main branch reference', await mainRef.json());
}