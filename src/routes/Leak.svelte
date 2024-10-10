<script lang="ts">
  import type { User } from "$lib/Test.svelte";
  import ScrollList, { type ScrollListController } from "./ScrollList.svelte";

  type Props = {
    users: User[]
  }

  const { users }: Props = $props()

  let ctrl: ScrollListController | undefined

  $effect(() => {
    if (users.length === 0) {
      return;
    }

    ctrl?.scrollBottom();
  });
</script>

<div class="container">
  <ScrollList align="bottom" pin={users.length > 1} items={users} getKey={(user) => user.id} controller={(c) => {
    ctrl = c
  }}>
    {#snippet children({ item: user })}
    <div>User: {user.id}, Friend: {user.friend?.id}</div>
    {/snippet}
  </ScrollList>
</div>

<style>
  .container {
    height: 100px;
  }
</style>
