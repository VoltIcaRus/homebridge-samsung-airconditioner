□ 설치 방법
  * 저의 작업 환경 : 시놀로지 나스 도커, marcoraddatz/homebridge 이미지 사용
                    삼성 가습 공기청정기 (17년형, AX40M6581WMD 모델 사용)

 1) Homebridge 설치
   
    npm install -g https://github.com/Km81/homebridge-samsung-airpurifier

 2) jq 설치 및 장비 토큰 추출
   ① Putty로 도커 이미지에 접속
     sudo docker exec -it homebridge-samsung-airpurifier /bin/sh
     (homebridge-samsung-airpurifier 도커 이미지 이름)

   ② jq 설치
     apt-get install --no-cache jq

   ③ 토큰 추출 (도커 이미지 접속 상태에서 진행)

     cd /usr/local/lib/node_modules/homebridge-samsung-airpurifier
    
     상기 폴더로 이동 후,

     폴더 내 파일인 Server8889.py 파일의 내용 중 certfile의 경로를 수정 
     (marcoraddatz/homebridge 이미지를 사용할 경우, 수정 불필요)
    
     certfile='/usr/local/lib/node_modules/homebridge-samsung-airpurifier/ac14k_m.pem' 
    
     수정 완료 후, 하기 파이썬 실행

     python Server8889.py
 
     이 상태에서 Putty 창을 하나 더 실행하고, 같은 도커 이미지에 다시 접속 후, 경로 이동

     sudo docker exec -it homebridge-samsung-airpurifier /bin/sh
     cd /usr/local/lib/node_modules/homebridge-samsung-airpurifier

     그리고, 하기 커맨드 실행 

     curl -k -H "Content-Type: application/json" -H "DeviceToken: xxxxxxxxxxx" --cert /usr/local/lib/node_modules/homebridge-samsung-airpurifier/ac14k_m.pem --insecure -X POST https://192.168.1.xxx:8888/devicetoken/request
     (https://192.168.1.xxx 는 본인 에어컨 장비 ip로 수정)

     여기서, 에어컨 장비 전원을 키면 처음 Putty 창에서 토큰 정보가 나옴

      {"DeviceToken":"XXXXXXXXXX"} 

      토큰 추출 완료

 3) config 수정
   - config.json 파일 내 accessories 추가
     . "accessory" : 변경 불가 
     . "name" : 홈킷 장치 이름
     . "ip" : 삼성 공기청정기 장비 ip
     . "token" : 삼성 공기청정기 고유 토큰
     . "patchCert" : ac14k_m.pem 파일 경로    

  예시) 
 
  "accessories": [
	{
      "accessory": "SamsungAirpurifier",
      "name": "침실 공기청정기",
      "ip": "192.168.1.XX",
      "token": "XXXXXXXXX",
      "patchCert": "/usr/local/lib/node_modules/homebridge-samsung-airpurifier/ac14k_m.pem"
	}
  ],

□ 홈킷 구성 내용
  1) 설정
    - 스윙모드    →   가습 설정 [ Off : 해제 / On : 가습 ]
    - 모드        →   풍속 설정 [ 수동 : 취침 / 자동 : 자동풍 ]   
