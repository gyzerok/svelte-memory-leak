export class Test {
  now = $state(0)

  constructor() {
    setInterval(() => {
      this.now = Date.now()
    }, 1000)
  }
}
