<template>
  <div class="speech-recognition-view">
    <SpeechRecognition />
  </div>
</template>

<script setup>
import SpeechRecognition from '../components/SpeechRecognition.vue'
</script>

<style scoped>
.speech-recognition-view {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 20px;
}
</style>