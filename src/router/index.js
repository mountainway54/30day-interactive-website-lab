import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/day-01',
    },
    {
      path: '/day-01',
      name: 'day-01',
      component: () => import('@/days/day-01/Day01View.vue'),
      meta: {
        day: 1,
        title: 'DOM 與 Vue 生命週期',
      },
    },
    {
      path: '/day-02',
      name: 'day-02',
      component: () => import('@/days/day-02/Day02View.vue'),
      meta: {
        day: 2,
        title: '用 Input 控制動畫參數',
      },
    },
    {
      path: '/day-03',
      name: 'day-03',
      component: () => import('@/days/day-03/Day03View.vue'),
      meta: {
        day: 3,
        title: 'GSAP Timeline Position Parameter',
      },
    },
    {
      path: '/day-04',
      name: 'day-04',
      component: () => import('@/days/day-04/Day04View.vue'),
      meta: {
        day: 4,
        title: 'GSAP Stagger 與 Reverse',
      },
    },
    {
      path: '/day-05',
      name: 'day-05',
      component: () => import('@/days/day-05/Day05View.vue'),
      meta: {
        day: 5,
        title: 'ScrollTrigger 視差滾動敘事',
      },
    },
    {
      path: '/day-06',
      name: 'day-06',
      component: () => import('@/days/day-06/Day06View.vue'),
      meta: {
        day: 6,
        title: 'GSAP 動畫管理與高頻互動',
      },
    },
    {
      path: '/day-08',
      name: 'day-08',
      component: () => import('@/days/day-08/Day08View.vue'),
      meta: {
        day: 8,
        title: 'Canvas 基本圖形：畫一張卡比獸頭像',
      },
    },
    {
      path: '/day-09',
      name: 'day-09',
      component: () => import('@/days/day-09/Day09View.vue'),
      meta: {
        day: 9,
        title: '用 GSAP 讓 Canvas 卡比獸動起來',
      },
    },
    {
      path: '/day-10',
      name: 'day-10',
      component: () => import('@/days/day-10/Day10View.vue'),
      meta: {
        day: 10,
        title: '讓 Canvas 卡比獸跟著游標看',
      },
    },
    {
      path: '/day-11',
      name: 'day-11',
      component: () => import('@/days/day-11/Day11View.vue'),
      meta: {
        day: 11,
        title: 'WebGL 漸層三角形',
      },
    },
    {
      path: '/day-12',
      name: 'day-12',
      component: () => import('@/days/day-12/Day12View.vue'),
      meta: {
        day: 12,
        title: 'WebGL 3D 立方體',
      },
    },
    {
      path: '/day-13',
      name: 'day-13',
      component: () => import('@/days/day-13/Day13View.vue'),
      meta: {
        day: 13,
        title: 'WebGL 座標空間轉換',
      },
    },
    {
      path: '/day-14',
      name: 'day-14',
      component: () => import('@/days/day-14/Day14View.vue'),
      meta: {
        day: 14,
        title: 'GLSL 型別表',
      },
    },
    {
      path: '/day-15',
      name: 'day-15',
      component: () => import('@/days/day-15/Day15View.vue'),
      meta: {
        day: 15,
        title: 'WebGL 固定平行光與亮度控制',
      },
    },
  ],
})

export default router
