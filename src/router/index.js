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
  ],
})

export default router
