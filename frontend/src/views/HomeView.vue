<style scoped>
.search-bar {
  margin-top: 1rem;
  padding: 0.8rem 1.2rem;
  width: 100%;
  max-width: 420px;
  border: 2px solid #00aaff;
  border-radius: 10px;
  font-size: 1.1rem;
  outline: none;
  transition: box-shadow 0.3s;
  box-shadow: 0 0 0 rgba(0, 170, 255, 0);
}
.search-bar:focus {
  box-shadow: 0 0 8px rgba(0, 170, 255, 0.3);
}

.testimonial-carousel {
  background: linear-gradient(135deg, #ffffff, #f2f9ff);
  padding: 2rem;
  border-radius: 1rem;
  margin: 2rem auto;
  max-width: 720px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.05);
  text-align: center;
}
.testimonial-carousel h2 {
  margin-bottom: 1.2rem;
  color: #222;
}
.testimonial blockquote {
  font-size: 1.2rem;
  font-style: italic;
  color: #333;
  max-width: 600px;
  margin: 0 auto;
}
.testimonial footer {
  margin-top: 0.8rem;
  font-weight: bold;
  color: #777;
}

.hoverable {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hoverable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.animate-fade-in {
  animation: fadeIn 0.8s ease-out both;
}
.animate-cta {
  animation: pulse 2.5s infinite;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
</style>
