<script lang="ts">
  import PartySocket from "partysocket";
  import { onMount } from "svelte";

  const ws = new PartySocket({
    host: window.location.host,
    room: "room1",
    party: "my-server",
  });

  let message = $state();

  onMount(() => {
    ws.addEventListener("message", onMessage);
    ws.send("hello from the client!");
  });

  function onMessage(event: MessageEvent) {
    message = event.data;
  }
</script>

<main class="flex flex-col items-center justify-center h-screen">
  <h1 class="text-4xl font-bold">🤖</h1>
  <p class="text-2xl font-bold">bot</p>
  <div>
    {message}
  </div>
</main>
