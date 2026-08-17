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
  ],
})

export default router
