/* Buat repo GitHub lewat API memakai token dari Git Credential Manager. */
const token = process.env.GH_TOKEN;
const NAME = process.env.REPO_NAME || "ngariung";

if (!token) {
  console.error("GH_TOKEN kosong");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "ngariung-setup",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
};

async function main() {
  const me = await fetch("https://api.github.com/user", { headers });
  if (!me.ok) {
    console.error("auth gagal", me.status, (await me.text()).slice(0, 200));
    process.exit(2);
  }
  const user = await me.json();
  console.log("login:", user.login, "| scopes:", me.headers.get("x-oauth-scopes") || "-");

  const res = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: NAME,
      description: "Absen harian & streak nongkrong mahasiswa Polban",
      private: false,
      has_issues: true,
      has_wiki: false,
    }),
  });

  if (res.status === 201) {
    const repo = await res.json();
    console.log("created:", repo.html_url, "| clone:", repo.clone_url);
    return;
  }

  if (res.status === 422) {
    console.log("sudah ada:", `https://github.com/${user.login}/${NAME}`);
    return;
  }

  console.error("gagal:", res.status, (await res.text()).slice(0, 300));
  process.exit(3);
}

main();
