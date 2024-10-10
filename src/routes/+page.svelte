<script lang="ts">
  import { Pool, User } from "$lib/Test.svelte";
  import Leak from "./Leak.svelte";

  let show = $state(false);

  const pool = new Pool();
  // // @ts-expect-error
  // window.pool = pool;

  const addUser = () => {
    pool.users.set(3, new User(pool, 3, 4));
  };
</script>

<button onclick={() => (show = !show)}>Toggle</button>
{#if show}
  <div>
    <button onclick={() => addUser()}>Add 3</button>
  </div>
  {@const users = [...pool.users.values()]}

  <Leak {users} />
{/if}
