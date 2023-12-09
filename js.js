const MOD_LABELS = [
    'negativest',
    'negativer',
    'negative',
    'neutral',
    'positive',
    'positiver',
    'positivest'
];

const API_HOST = 'api.yinyang.computerpho.be';
const IMG_HOST = 'images.yinyang.computerpho.be';

function onUrlChange(e) {
    document.getElementById('sourceImage').src = e.target.value;
}

document.getElementById('yinyangUrl').addEventListener('change', onUrlChange);

document.getElementById('yinyangUrl').addEventListener('focus', (e) => { e.target.select(); });

document.getElementById('openaiKey').addEventListener('change', (e) => {
    if ((e.target.value.length === 51 && e.target.value.indexOf('sk-') === 0) || e.target.value.length === 64) {
        document.getElementById('yinyang').disabled = false;
    }
});

document.getElementById('thresMod').addEventListener('change', (e) => {
    document.getElementById('thresModLabel').innerText = MOD_LABELS[Number.parseInt(e.target.value) + Number.parseInt(e.target.max)];
});

async function loader(reqIdParam, _event) {
    document.getElementById('yinyang').parentElement.removeChild(document.getElementById('yinyang'));
    const urlEle = document.getElementById('yinyangUrl');
    urlEle.removeEventListener('change', onUrlChange)
    const imageUrl = urlEle.value;
    document.getElementById('yinyangUrlRO').href = imageUrl;
    const sourceDiv = document.getElementById('sourceDiv');
    sourceDiv.style.display = 'block';
    sourceDiv.style.visibility = 'visible';
    document.getElementById('thresMod').disabled = true;
    const oaiKeyEle = document.getElementById('openaiKey');
    const openaiKey = oaiKeyEle.value;
    if (document.getElementById('storeKeyLocally').checked) {
        window.localStorage.setItem('openaiKey', openaiKey);
    }

    oaiKeyEle.parentElement.parentElement.removeChild(oaiKeyEle.parentElement);

    document.getElementById('sourceImage').src = imageUrl;
    document.title = '⏳  🖼️☯️';
    const url = `https://${API_HOST}/${reqIdParam ?? ''}`
    const result = await fetch(url, reqIdParam ? {} : {
        method: 'POST',
        body: imageUrl,
        headers: {
            'X-Yinyang-OpenAI-Key': openaiKey,
            'X-Yinyang-Threshold-Mod': document.getElementById('thresMod').value,
        }
    });
    if (result.status > 299) {
        document.getElementById('metadata').innerText = `Request failed! Please try again soon`;
        document.getElementById('goodImage').src = document.getElementById('badImage').src = '';
        return;
    }

    const resultBody = await result.json();
    const { requestId, response, sentences, results: { good, bad }, meta } = resultBody;
    const imageDesc = document.getElementById('imageDesc');
    sentences.forEach(({ sentence, sentiment: { good } }) => {
        const ele = document.createElement('span');
        ele.style.color = good ? 'white' : 'black';
        ele.innerText = sentence + '.';
        imageDesc.appendChild(ele);
    });
    document.getElementById('goodPrompt').innerText = good.prompt;
    document.getElementById('badPrompt').innerText = bad.prompt;
    document.getElementById('metadata').innerText = `OpenAI tokens used: ${meta.openai_tokens_used}`;
    document.getElementById('reqId').style.display = 'block';
    const reqIdLink = document.getElementById('reqIdLink');
    reqIdLink.innerText = requestId;
    reqIdLink.href = `${window.location.origin}/?req=${requestId}`;

    reqBottomHalf(requestId, resultBody);
}

async function reqBottomHalf(requestId, resultBody) {
    if (!resultBody) {
        const result = await fetch(`https://${API_HOST}/${requestId}`);
        if (result.status === 202) {
            setTimeout(() => reqBottomHalf(requestId), 3000);
            return;
        }

        resultBody = await result.json();
    }

    document.title = '🖼️☯️';
    const { input: { url }, results: { good, bad } } = resultBody;
    document.getElementById('goodImage').src = `https://${IMG_HOST}/${good.imageBucketId}`;
    document.getElementById('badImage').src = `https://${IMG_HOST}/${bad.imageBucketId}`;
    document.getElementById('yinyangUrl').value = url;
}

document.getElementById('yinyang').addEventListener('click', loader.bind(null, null));

document.addEventListener('DOMContentLoaded', (e) => {
    if (window.localStorage.getItem('openaiKey')) {
        const oaiKeyEle = document.getElementById('openaiKey');
        oaiKeyEle.value = window.localStorage.getItem('openaiKey');
        oaiKeyEle.disabled = true;
        const sklEle = document.getElementById('storeKeyLocally');
        sklEle.checked = true;
        sklEle.disabled = true;
        const sklCont = document.getElementById('sklCont');
        const rmBut = document.createElement('a');
        rmBut.addEventListener('click', (e) => {
            window.localStorage.removeItem('openaiKey');
            sklEle.checked = false;
            sklEle.disabled = false;
            oaiKeyEle.value = '';
            oaiKeyEle.disabled = false;
            rmBut.parentElement.removeChild(rmBut);
        });
        rmBut.innerText = 'Clear stored key.';
        rmBut.href = '';
        sklCont.appendChild(rmBut);
        document.getElementById('yinyang').disabled = false;
    }

    const { searchParams } = new URL(window.location.href);
    const reqParam = searchParams.get('req');

    if (reqParam) {
        loader(reqParam);
    }
});