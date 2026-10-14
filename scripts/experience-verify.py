# 完成した MP4 の音声を、取り込んだ1文ずつの音声と照合する（欠落・重複・順序違い・途中で切れていないか）。
#   python3 scripts/experience-verify.py out/experience/final/<名前>.manifest.json
# 各文の音声が、台本どおりの位置（±0.12秒）に、1回だけ入っているかを相互相関で確かめる。numpy が必要。
import json, subprocess, sys, os
import numpy as np

SR = 8000
ROOT = os.path.join(os.path.dirname(__file__), '..')


def pcm(path, start=None, dur=None):
    args = ['ffmpeg', '-nostdin', '-loglevel', 'error']
    if start is not None:
        args += ['-ss', f'{max(0, start):.3f}', '-t', f'{dur:.3f}']
    args += ['-i', path, '-vn', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-']
    return np.frombuffer(subprocess.run(args, capture_output=True, check=True).stdout, np.int16).astype(np.float32)


def ncc(sig, ref):
    # 正規化相互相関（累積和で窓ごとのエネルギーを求める）
    n = len(ref)
    if len(sig) < n:
        return np.array([0.0])
    c = np.correlate(sig, ref, 'valid')
    e = np.cumsum(np.concatenate([[0], sig ** 2]))
    win = np.sqrt(np.maximum(e[n:] - e[:-n], 1e-9))
    return c / (win * (np.linalg.norm(ref) + 1e-9))


def main(manifest_path):
    m = json.load(open(manifest_path))
    video = os.path.join(os.path.dirname(manifest_path), m['file'])
    full = pcm(video)
    rows, problems, seen = [], [], {}
    prev_end = -1
    for clip in m['clips']:
        clip_end = clip['start'] + clip['duration']
        for ln in clip['lines']:
            lid = ln['lineId']
            seen[lid] = seen.get(lid, 0) + 1
            ref = pcm(os.path.join(ROOT, 'public', 'experience', 'audio', f'{lid}.mp3'))
            a = int((ln['at'] - 0.3) * SR)
            sig = full[max(0, a): a + len(ref) + int(0.6 * SR)]
            r = ncc(sig, ref)
            k = int(np.argmax(r))
            lag = (max(0, a) + k) / SR - ln['at']
            score = float(r[k])
            end = ln['at'] + ln['seconds']
            ok = score > 0.6 and abs(lag) < 0.12
            if not ok:
                problems.append(f'{lid}：照合できない（一致度 {score:.2f}、ずれ {lag:+.2f}秒）')
            if end > clip_end - 0.2:
                problems.append(f'{lid}：クリップの終わり（{clip_end:.2f}秒）までに話し終わらない')
            if ln['at'] < prev_end:
                problems.append(f'{lid}：前の文と重なっている／順序が違う')
            prev_end = end
            rows.append((lid, ln['at'], score, lag))
    dup = [k for k, v in seen.items() if v > 1]
    if dup:
        problems.append(f'重複：{dup}')
    scores = [r[2] for r in rows]
    print(f"{m['file']}：{len(rows)}文を照合／一致度 最小 {min(scores):.2f}・平均 {np.mean(scores):.2f}／ずれ 最大 {max(abs(r[3]) for r in rows):.3f}秒")
    print('問題なし' if not problems else '\n'.join(problems))
    return 0 if not problems else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1]))
