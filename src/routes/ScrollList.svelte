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

  let intersectionObserver: IntersectionObserver | null = null;

  function setup(node: HTMLDivElement) {
    const content = node.children[0];
    if (!(content instanceof HTMLDivElement)) {
      throw new Error('irrelevant')
    }

    const EDGE_THRESHOLD = 5;

    const isTop = () => {
      return node.scrollTop <= EDGE_THRESHOLD;
    };
    const isBottom = () => {
      return node.scrollTop + node.clientHeight >= node.scrollHeight - EDGE_THRESHOLD;
    };

    let wasPinned = pin;
    let wasBottom = isBottom();
    let wasTop = isTop();
    let nodeHeight = node.clientHeight;

    let anchor: { node: Element; offset: number } = {
      node: content,
      offset: 0,
    };
    let defaultIndex;
    switch (align) {
      case 'top':
        defaultIndex = 0;
        break;

      case 'bottom':
        defaultIndex = items.length - 1;
        break;

      default:
        const _typeguard: never = align;
        defaultIndex = align;
    }
    const index = initalScrollIndex || defaultIndex;
    const initialAnchorNode = content.children[index];
    if (initialAnchorNode) {
      anchor.node = initialAnchorNode;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      let diff = 0;

      for (const entry of entries) {
        if (entry.target === node) {
          if (!isBottom()) {
            diff = node.clientHeight - nodeHeight;

            node.scroll({
              top: node.scrollTop - diff,
              behavior: 'instant',
            });

            anchor.offset -= diff;
          }

          nodeHeight = node.clientHeight;
        }

        if (entry.target === content) {
          // Если размер контента стал меньше, чем размер контейнера,
          // то тоже будем репортить скролл, поскольку измениятся оффсеты.
          if (content.clientHeight <= node.clientHeight) {
            handleScroll();
          }

          // Если до ресайза мы были запинены, то будем сохранять запин
          if (wasPinned) {
            switch (align) {
              case 'top':
                if (wasTop) {
                  return node.scroll({
                    top: 0,
                    behavior: 'instant',
                  });
                }

                break;

              case 'bottom':
                if (wasBottom) {
                  return node.scroll({
                    top: node.scrollHeight,
                    behavior: 'instant',
                  });
                }

                break;

              default:
                const _typeguard: never = align;
            }
          }

          // Если размер контента поменялся, то нам нужно восстановить скролл
          // к предыдущему якорю
          node.scroll({
            // @ts-expect-error нода гарантированно является HTMLElement
            top: anchor.node.offsetTop + anchor.node.clientHeight - anchor.offset,
            behavior: 'instant',
          });
        }
      }

      wasTop = isTop();
      wasBottom = isBottom();
    });

    resizeObserver.observe(node);
    resizeObserver.observe(content);

    const visibleNodes = new Set<Element>();
    let prevRange: VisibleRange = { start: -1, end: -1 };
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleNodes.add(entry.target);
          } else {
            visibleNodes.delete(entry.target);
          }
        }
        const range = { start: items.length - 1, end: 0 };
        for (const node of visibleNodes.keys()) {
          const index = nodeIndex.get(node)!;
          if (index === undefined) {
            continue;
          }
          range.start = Math.min(range.start, index);
          range.end = Math.max(range.end, index);
        }
        if (range.start > range.end) {
          // TODO: странное, может ошибку бахнуть?
          return;
        }
        if (range.start === prevRange.start && range.end === prevRange.end) {
          return;
        }
        // TODO: возможно тут стоит идти вглубину ноды и брать последнего ребенка,
        // у которого и брать оффсет, но пока будем выранивать по нижней границы
        const anchorIndex = header ? range.start + 1 : range.start;
        anchor.node = content.children[anchorIndex]!;
        // @ts-expect-error нода гарантированно является HTMLElement
        anchor.offset = anchor.node.offsetTop + anchor.node.clientHeight - node.scrollTop;
        onViewportUpdate?.(range);
        prevRange = range;
      },
      {
        root: node,
        threshold: 0.5,
      },
    );
    for (const node of nodeIndex.keys()) {
      intersectionObserver.observe(node);
    }

    const ctrl = {
      scrollTo: (index: number, align: ScrollAlign, behavior: ScrollBehavior = 'instant'): void => {
        index = header ? index + 1 : index;
        const to = content.children[index];
        to?.scrollIntoView({
          block: align,
          behavior,
        });
      },

      scrollBottom: (behavior: ScrollBehavior = 'instant'): void => {
        if (wasBottom) {
          return;
        }

        node.scroll({
          top: node.scrollHeight,
          behavior,
        });
        wasBottom = true;
      },
    };

    const handleWheel = (e: WheelEvent) => {
      // Если мы навернху или внизу, то дельта скролла может оставаться положительной,
      // хотя никакого скролла на самом деле не происходит.
      // Это потому что бразуеры делают пружинную анимацию на границах контейнера для красоты.
      // Соответственно чтобы не уменшать/увеличивать оффсет бесконечно, мы будем игнорировать
      // этот кейс.
      if (isTop() || isBottom()) {
        return;
      }

      // Поскольку мы подправляем анчор только в следующем фрейме стека в setTimeout,
      // мы можем пропустить очередной замер перед ресайзом и это вызовет небольшой дополнительный
      // сдвиг, который создаст ощущение лагающего скролла.
      // Это пока единственный хитрый способ, который я придумал, чтобы это поправить.
      // Можно было бы так делать и в скролл евенте, но там нет дельты, поэтому используем wheel.
      anchor.offset = anchor.offset - e.deltaY;
    };
    node.addEventListener('wheel', handleWheel, { passive: true });

    let timeoutId = 0;
    const handleScroll = () => {
      // Таймаут нужен для того, чтобы обновление анчора гарантированно скедулилось
      // после ресайза
      timeoutId = window.setTimeout(() => {
        wasBottom = isBottom();
        wasTop = isTop();
        wasPinned = pin;

        onAfterScroll?.({
          offsetTop: node.scrollTop,
          offsetBottom: node.scrollHeight - node.scrollTop - node.clientHeight,
        });
      }, 0);
    };
    node.addEventListener('scroll', handleScroll, { passive: true });

    controller?.(ctrl);
    handleScroll();

    return {
      update() {},

      destroy() {
        node.removeEventListener('wheel', handleWheel);
        node.removeEventListener('scroll', handleScroll);
        resizeObserver.unobserve(node);
        resizeObserver.unobserve(content);
        resizeObserver.disconnect();
        intersectionObserver?.disconnect();
        intersectionObserver = null;
        clearTimeout(timeoutId);
      },
    };
  }

  const nodeIndex: Map<Element, number> = new Map();

  const tracker = (node: Element, index: number) => {
    nodeIndex.set(node, index);
    intersectionObserver?.observe(node);

    return {
      update(newIndex: number) {
        nodeIndex.set(node, newIndex);
      },

      destroy() {
        intersectionObserver?.unobserve(node);
        nodeIndex.delete(node);
      },
    };
  };
</script>

<div class="container" use:setup>
  <div class="content content--{align}">
    {#if header}
      <div class="item">
        {@render header()}
      </div>
    {/if}

    {#each items as item, i (getKey(item))}
      <div class="item" animate:animate use:tracker={i}>
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
