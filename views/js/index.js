const URLSearch = new URLSearchParams(location.search)

const btn = document.querySelector("#btn")
const body = document.createElement('style');
btn.addEventListener("click", callback);

async function callback() {

    var v = grecaptcha.getResponse();
	if (v.length ==0) {
		alert ("'로봇이 아닙니다.'를 체크해주세요.");
		return false;
	} else {
    const req = {
        success: true,
        code: URLSearch.get('code'),
        state: URLSearch.get('state'),
    }
    fetch('/callback', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(req)
        

    }).then((res) => res.json())
      .then(async (res) => {
            if(res.success === true) {
                body.innerHTML=".main {-webkit-filter: blur(5px); -moz-filter: blur(5px); -o-filter: blur(5px); -ms-filter: blur(5px); filter: blur(5px);}"
                document.head.appendChild(body)
                let timerInterval
                Swal.fire({
                    color: "#000000",
                    title: "인증 완료",
                    html: `인증완료 되었습니다, 이창은 종료 하셔도됩니다`,
                    timer: 8000,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    footer: '이 창은 8초뒤에 자동으로 닫힙니다',
                    icon: "success",
                    didOpen: () => {
                        Swal.showLoading()
                        const b = Swal.getHtmlContainer().querySelector('b')
                        timerInterval = setInterval(() => {
                            b.textContent = Swal.getTimerLeft()
                        }, 100)
                    },
                    willClose: () => {
                        clearInterval(timerInterval)
                    }
                }).then((result) => {
                    if (result.dismiss === Swal.DismissReason.timer) {
                        window.close();
                    }
                })
            } else if (res.success === false) {
                body.innerHTML=".main {-webkit-filter: blur(5px); -moz-filter: blur(5px); -o-filter: blur(5px); -ms-filter: blur(5px); filter: blur(5px);}"
                document.head.appendChild(body)
                let timerInterval
                Swal.fire({
                    color: "#000000",
                    title: "인증 실패",
                    html: `알 수 없는 이유로 인증이 실패했습니다`,
                    timer: 8000,
                    timerProgressBar: true,
                    showConfirmButton: false,
                    footer: '이 창은 8초뒤에 자동으로 닫힙니다',
                    icon: "error",
                    didOpen: () => {
                        Swal.showLoading()
                        const b = Swal.getHtmlContainer().querySelector('b')
                        timerInterval = setInterval(() => {
                            b.textContent = Swal.getTimerLeft()
                        }, 100)
                    },
                    willClose: () => {
                        clearInterval(timerInterval)
                    }
                }).then((result) => {
                    if (result.dismiss === Swal.DismissReason.timer) {
                        window.close();
                    }
                })
            }
        })
    }
}