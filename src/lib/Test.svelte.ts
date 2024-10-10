import { untrack } from "svelte"
import { SvelteMap } from "svelte/reactivity"

export class Pool {
  users: SvelteMap<number, User> = new SvelteMap()

  now = $state(0)

  constructor() {
    this.users.set(1, new User(this, 1))
    this.users.set(2, new User(this, 2, 1))
  }

}

export class User {
  readonly id: number
  friendId?: number

  constructor(private readonly pool: Pool, id: number, friendId?: number) {
    this.id = id
    this.friendId = friendId
  }

  get friend(): User | undefined {
    if (!this.friendId) {
      return undefined
    }

    const id = this.friendId
    const friend = this.pool.users.get(id)

    if (friend) {
      return friend
    }

    return untrack(() => {
      const user = new User(this.pool, id)

      this.pool.users.set(user.id, user)

      return user
    })
  }
}
