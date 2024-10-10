<script module lang="ts">
  export type ContainerAlign = 'top' | 'bottom';
  export type ScrollAlign = 'start' | 'center' | 'end';
  export type ScrollBehavior = 'smooth' | 'instant';
  export type ScrollPin = 'top' | 'bottom';
  export type VisibleRange = { start: number; end: number };
  export type VisibleArea = { offsetTop: number; offsetBottom: number };

  export interface ScrollListController {
    scrollTo(index: number, align: ScrollAlign, behavior?: ScrollBehavior): void;
    scrollBottom(behavior?: ScrollBehavior): void;
  }
</script>

<script lang="ts" generics="Item">
  import { type Snippet } from 'svelte';
  import { type AnimationConfig } from 'svelte/animate';

  type Props = {
    align: ContainerAlign;
    pin?: boolean;
    children: Snippet<[{ item: Item; index: number }]>;
    header?: Snippet;
    footer?: Snippet;
    animate?: (node: HTMLElement, fromTo: { from: DOMRect; to: DOMRect }) => AnimationConfig;
    initalScrollIndex?: number;
    getKey: (item: Item) => string | number;
    items: Item[];
    controller?: (ctrl: ScrollListController) => void;
    onViewportUpdate?: (range: VisibleRange) => void;
    onAfterScroll?: (area: VisibleArea) => void;
  };

  const {
    pin = false,
    align,
    initalScrollIndex,
    getKey,
    items,
    children,
    footer,
    header,
    animate = () => {
      return {};
    },
    controller,
    onViewportUpdate,
    onAfterScroll,
  }: Props = $props();

  function setup(node: HTMLDivElement) {
    const content = node.children[0];
    if (!(content instanceof HTMLDivElement)) {
      throw new Error('irrelevant')
    }

    const ctrl = {
      scrollTo: (index: number, align: ScrollAlign, behavior: ScrollBehavior = 'instant'): void => {
      },

      scrollBottom: (behavior: ScrollBehavior = 'instant'): void => {
        node.scroll({
          top: node.scrollHeight,
          behavior,
        });
      },
    };

    controller?.(ctrl);

    return {
      update() {},

      destroy() {
      },
    };
  }
</script>

<div class="container" use:setup>
  <div class="content content--{align}">
    {#if header}
      <div class="item">
        {@render header()}
      </div>
    {/if}

    {#each items as item, i (getKey(item))}
      <div class="item" animate:animate>
        {@render children({ item, index: i })}
      </div>
    {/each}

    {#if footer}
      <div class="item">
        {@render footer()}
      </div>
    {/if}
  </div>
</div>

<style>
  .container {
    position: relative;
    overflow-y: scroll;
    overflow-anchor: none;
    height: 100%;
    will-change: transform;
  }

  .content {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    /* will-change: transform; */
    min-height: 100%;
  }

  .content--bottom {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  .item {
    /* TODO: попробовать для перфа */
    /* content-visibility: auto; */
    width: 100%;
  }
</style>
