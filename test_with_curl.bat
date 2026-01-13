@echo off
echo 🚀 开始使用curl测试图片分析...

echo 📤 发送分析请求到后端...
curl -X POST ^
  -F "images=@test_image_1.jpg" ^
  -F "images=@test_image_2.jpg" ^
  -F "images=@test_image_3.jpg" ^
  -F "images=@test_image_4.jpg" ^
  http://localhost:3002/api/analyze-exam

echo.
echo ✅ 测试完成！
pause