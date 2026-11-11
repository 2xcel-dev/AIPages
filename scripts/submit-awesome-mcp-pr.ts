import "dotenv/config";
import fs from "node:fs";

async function run() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN missing from .env");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "AIPages-Automation",
  };

  const forkOwner = "TwoXceL";
  const upstreamOwner = "punkpeye";
  const repo = "awesome-mcp-servers";
  const branchName = "add-aipages-gateway";

  console.log(`[P3-PR] Fetching branch ${branchName} ref...`);
  const refResp = await fetch(
    `https://api.github.com/repos/${forkOwner}/${repo}/git/ref/heads/${branchName}`,
    { headers }
  );
  if (!refResp.ok) {
    throw new Error(`Failed to get ref: ${refResp.status} ${await refResp.text()}`);
  }
  const refData = (await refResp.json()) as { object: { sha: string } };
  const baseCommitSha = refData.object.sha;
  console.log(`[P3-PR] Base commit SHA: ${baseCommitSha}`);

  // Fetch the commit to get tree SHA
  const commitResp = await fetch(
    `https://api.github.com/repos/${forkOwner}/${repo}/git/commits/${baseCommitSha}`,
    { headers }
  );
  const commitData = (await commitResp.json()) as { tree: { sha: string } };
  const baseTreeSha = commitData.tree.sha;
  console.log(`[P3-PR] Base tree SHA: ${baseTreeSha}`);

  // Download raw README.md
  console.log(`[P3-PR] Fetching raw README.md...`);
  const rawResp = await fetch(
    `https://raw.githubusercontent.com/${forkOwner}/${repo}/${branchName}/README.md`,
    { headers }
  );
  let content = await rawResp.text();

  if (content.includes("AIPages") || content.includes("aipages.tech")) {
    console.log(`[P3-PR] AIPages already present in README.md!`);
  } else {
    // Add AIPages to Aggregators section
    const targetHeader = '### 🔗 <a name="aggregators"></a>Aggregators';
    const headerPos = content.indexOf(targetHeader);
    if (headerPos === -1) {
      throw new Error(`Could not locate "${targetHeader}" in README.md`);
    }

    // Insert after the description line
    const descEnd = content.indexOf("\n\n", headerPos);
    if (descEnd === -1) {
      throw new Error(`Could not find end of description for Aggregators`);
    }

    const aipagesEntry =
      `- [AIPages](https://github.com/2xcel-dev/AIPages) ☁️ - Machine-native discovery registry, vector search, and upstream execution gateway for autonomous MCP servers with Base USDC micro-settlement. Platform directory at [aipages.tech](https://aipages.tech).\n`;

    content = content.slice(0, descEnd + 2) + aipagesEntry + content.slice(descEnd + 2);
    console.log(`[P3-PR] Successfully inserted AIPages entry into README.md`);

    // Create a new blob for README.md
    console.log(`[P3-PR] Creating blob for updated README.md...`);
    const blobResp = await fetch(
      `https://api.github.com/repos/${forkOwner}/${repo}/git/blobs`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          content,
          encoding: "utf-8",
        }),
      }
    );
    if (!blobResp.ok) {
      throw new Error(`Failed to create blob: ${blobResp.status} ${await blobResp.text()}`);
    }
    const blobData = (await blobResp.json()) as { sha: string };
    console.log(`[P3-PR] Created blob: ${blobData.sha}`);

    // Create a new tree
    console.log(`[P3-PR] Creating tree...`);
    const treeResp = await fetch(
      `https://api.github.com/repos/${forkOwner}/${repo}/git/trees`,
      {
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
      }
    );
    if (!treeResp.ok) {
      throw new Error(`Failed to create tree: ${treeResp.status} ${await treeResp.text()}`);
    }
    const treeData = (await treeResp.json()) as { sha: string };
    console.log(`[P3-PR] Created tree: ${treeData.sha}`);

    // Create commit
    console.log(`[P3-PR] Creating commit...`);
    const newCommitResp = await fetch(
      `https://api.github.com/repos/${forkOwner}/${repo}/git/commits`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: "Add AIPages to Aggregators section",
          tree: treeData.sha,
          parents: [baseCommitSha],
        }),
      }
    );
    if (!newCommitResp.ok) {
      throw new Error(
        `Failed to create commit: ${newCommitResp.status} ${await newCommitResp.text()}`
      );
    }
    const newCommitData = (await newCommitResp.json()) as { sha: string };
    console.log(`[P3-PR] Created commit: ${newCommitData.sha}`);

    // Update branch ref
    console.log(`[P3-PR] Updating branch ${branchName}...`);
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
    if (!updateRefResp.ok) {
      throw new Error(
        `Failed to update ref: ${updateRefResp.status} ${await updateRefResp.text()}`
      );
    }
    console.log(`[P3-PR] Branch ${branchName} successfully updated with commit!`);
  }

  // Open Pull Request to punkpeye/awesome-mcp-servers
  console.log(`[P3-PR] Creating Pull Request against ${upstreamOwner}/${repo}...`);
  const prTitle = "Add AIPages - Discovery Registry & Execution Gateway";
  const prBody = `### Description
Adds [AIPages](https://github.com/2xcel-dev/AIPages) to the Aggregators / Cloud Gateways section.

AIPages (https://aipages.tech) is an open-source machine-native discovery registry and upstream execution gateway for Model Context Protocol (MCP) servers and autonomous AI tools, supporting x402 micro-settlements on Base L2.

- **Type:** Cloud Utility / Aggregator / Gateway
- **Repository:** https://github.com/2xcel-dev/AIPages
- **Live Directory & Vectors:** https://aipages.tech
- **OpenAPI:** https://aipages.tech/api/openapi.json
`;

  const prResp = await fetch(`https://api.github.com/repos/${upstreamOwner}/${repo}/pulls`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: prTitle,
      body: prBody,
      head: `${forkOwner}:${branchName}`,
      base: "main",
    }),
  });

  const prData = await prResp.json();
  if (!prResp.ok) {
    if (prData.errors && prData.errors[0]?.message?.includes("A pull request already exists")) {
      console.log(`[P3-PR] Notice: A pull request already exists for this branch.`);
    } else {
      console.warn(`[P3-PR] PR API response (${prResp.status}):`, prData);
    }
  } else {
    console.log(`[P3-PR] 🚀 SUCCESS! Pull Request created successfully!`);
    console.log(`[P3-PR] PR URL: ${prData.html_url}`);
  }
}

run().catch((err) => {
  console.error("[P3-PR] Fatal error:", err);
  process.exit(1);
});
