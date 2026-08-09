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
  ],
})

export default router
