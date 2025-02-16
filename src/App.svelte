<script lang="ts">
  import PartySocket from "partysocket";
  import { onMount } from "svelte";
  import README from "../README.md";
  // import { compile } from 'mdsvex';

  let analyzeResult = $state("");
  let prResult = $state("");
  let loading = $state(false);
  let error = $state("");
  let socket: PartySocket;

  onMount(async () => {
    socket = new PartySocket({
      host: window.location.host,
      room: "room1",
      party: "my-server",
    });

    socket.addEventListener("message", async (event) => {
      const data = JSON.parse(event.data);
      loading = false;

      switch (data.type) {
        case "analyzeResult":
          analyzeResult = data.suggestion;
          break;
        case "suggestedChanges":
          console.log("suggestedChanges", data.changes);
          break;
        case "prResult":
          prResult = `PR created: ${data.pr.html_url}`;
          analyzeResult = "";
          break;
        case "error":
          error = data.message;
          break;
      }
    });
  });

  function analyze() {
    loading = true;
    error = "";
    socket.send(JSON.stringify({ type: "analyze" }));
  }

  function createPR() {
    if (!analyzeResult) {
      error = "Please analyze first";
      return;
    }
    loading = true;
    error = "";
    socket.send(JSON.stringify({ type: "createPR" }));
  }
</script>

<main class="prose p-4 space-y-6 max-w-xl mx-auto py-20">
  <README />

  <hr />

  <div class="flex flex-col items-center space-y-4 w-full max-w-md">
    <button
      onclick={analyze}
      disabled={loading}
      class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 w-full"
    >
      {loading ? "Loading..." : "Analyze Code"}
    </button>

    {#if analyzeResult}
      <div class="w-full p-4 bg-gray-100 rounded">
        <h3 class="font-bold mb-2">Suggestion:</h3>
        <p class="whitespace-pre-wrap">{analyzeResult}</p>
      </div>

      <button
        onclick={createPR}
        disabled={loading}
        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 w-full"
      >
        Create Pull Request
      </button>
    {/if}

    {#if prResult}
      <div class="w-full p-4 bg-green-100 rounded">
        <p>{prResult}</p>
      </div>
    {/if}

    {#if error}
      <div class="w-full p-4 bg-red-100 text-red-700 rounded">
        <p>Error: {error}</p>
      </div>
    {/if}
  </div>
</main>
