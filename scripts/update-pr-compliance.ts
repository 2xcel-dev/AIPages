import "dotenv/config";

async function updatePR() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("Missing GITHUB_TOKEN");

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "AIPages-Automation",
  };

  const forkOwner = "TwoXceL";
  const repo = "awesome-mcp-servers";
  const branchName = "add-aipages-gateway";

  // Get current commit on branch
  const refResp = await fetch(
    `https://api.github.com/repos/${forkOwner}/${repo}/git/ref/heads/${branchName}`,
    { headers }
  );
  const refData = await refResp.json();
  const baseCommitSha = refData.object.sha;

  // Get commit tree
  const commitResp = await fetch(
    `https://api.github.com/repos/${forkOwner}/${repo}/git/commits/${baseCommitSha}`,
    { headers }
  );
  const commitData = await commitResp.json();
  const baseTreeSha = commitData.tree.sha;

  // Download raw README from this branch
  const rawResp = await fetch(
    `https://raw.githubusercontent.com/${forkOwner}/${repo}/${branchName}/README.md`,
    { headers }
  );
  let content = await rawResp.text();

  // Find the AIPages entry line previously added
  const oldEntry =
    "- [AIPages](https://github.com/2xcel-dev/AIPages) ☁️ - Machine-native discovery registry, vector search, and upstream execution gateway for autonomous MCP servers with Base USDC micro-settlement. Platform directory at [aipages.tech](https://aipages.tech).";

  const newEntry =
    "- [2xcel-dev/AIPages](https://github.com/2xcel-dev/AIPages) [![2xcel-dev/AIPages MCP server](https://glama.ai/mcp/servers/2xcel-dev/AIPages/badges/score.svg)](https://glama.ai/mcp/servers/2xcel-dev/AIPages) 🧰 ☁️ - Machine-native discovery registry, vector search, and upstream execution gateway for autonomous MCP servers with Base USDC micro-settlement. Platform directory at https://aipages.tech.";

  if (content.includes(oldEntry)) {
    content = content.replace(oldEntry, newEntry);
    console.log("[P3-Update] Replaced old entry with compliant owner/repo, badge, and emoji tags.");
  } else {
    // If not exact match, let's find any line with AIPages and replace it
    const lines = content.split("\n");
    const idx = lines.findIndex((l) => l.includes("AIPages"));
    if (idx !== -1) {
      lines[idx] = newEntry;
      content = lines.join("\n");
      console.log("[P3-Update] Replaced existing line at index", idx);
    } else {
      console.error("[P3-Update] Could not find AIPages line to replace!");
      return;
    }
  }

  // Create blob
  const blobResp = await fetch(`https://api.github.com/repos/${forkOwner}/${repo}/git/blobs`, {
    method: "POST",
    headers,
    body: JSON.stringify({ content, encoding: "utf-8" }),
  });
  const blobData = await blobResp.json();

  // Create tree
  const treeResp = await fetch(`https://api.github.com/repos/${forkOwner}/${repo}/git/trees`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: [
        {
          path: "README.md",
          mode: "100644",
          type: "blob",
          sha: blobData.sha,
        },
      ],
    }),
  });
  const treeData = await treeResp.json();

  // Create commit
  const newCommitResp = await fetch(`https://api.github.com/repos/${forkOwner}/${repo}/git/commits`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      message: "Fix AIPages entry: use full owner/repo, add Glama badge and permitted emoji tags",
      tree: treeData.sha,
      parents: [baseCommitSha],
    }),
  });
  const newCommitData = await newCommitResp.json();

  // Update ref
  const updateRefResp = await fetch(
    `https://api.github.com/repos/${forkOwner}/${repo}/git/refs/heads/${branchName}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        sha: newCommitData.sha,
        force: false,
      }),
    }
  );

  console.log("[P3-Update] Branch updated successfully:", updateRefResp.status);
  console.log("[P3-Update] PR #19156 will automatically re-run GitHub Actions validation!");
}

updatePR().catch(console.error);
