echo "=================================================="
echo "🏪 MAGAZIN - Ishga tushirish"
echo "=================================================="

echo ""
echo "⚙️  Backend build qilinmoqda..."
cd "$(dirname "$0")/backend"
CGO_ENABLED=1 go build -o magazin-server .

if [ $? -ne 0 ]; then
    echo "❌ Backend build xatosi!"
    exit 1
fi

echo "✅ Backend build tayyor!"

echo ""
echo "🔄 Avvalgi jarayonlar to'xtatilmoqda..."
pkill -f magazin-server 2>/dev/null

echo ""
echo "🚀 Backend ishga tushmoqda..."
./magazin-server &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

echo ""
echo "🎨 Frontend ishga tushmoqda..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "=================================================="
echo "✅ Hammasi ishga tushdi!"
echo "=================================================="
echo "🌐 Sayt:      http://localhost:3000"
echo "📦 API:       http://localhost:8080/api/products"
echo "🔐 Admin:     admin / admin123"
echo "=================================================="
echo ""
echo "To'xtatish uchun: Ctrl+C"

trap "echo ''; echo '🛑 To'\''xtatilmoqda...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait