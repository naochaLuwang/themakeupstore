import UIKit

final class StoreBrandSplashView: UIView {
    private let mark = UIView()
    private let nameLabel = UILabel()
    private let locationLabel = UILabel()
    private var bases: [CAShapeLayer] = []
    private var accents: [CAShapeLayer] = []
    private var observers: [NSObjectProtocol] = []

    // Same five strokes as assets/icon.svg and the Android native vector.
    private let strokes: [(CGPoint, CGPoint)] = [
        (CGPoint(x: 110.668, y: 156.047), CGPoint(x: 110.668, y: 273.023)),
        (CGPoint(x: 272.777, y: 115.918), CGPoint(x: 272.777, y: 273.020)),
        (CGPoint(x: 118.957, y: 111.934), CGPoint(x: 224.094, y: 269.242)),
        (CGPoint(x: 272.031, y: 117.078), CGPoint(x: 212.125, y: 205.531)),
        (CGPoint(x: 111.676, y: 157.121), CGPoint(x: 191.133, y: 271.746))
    ]

    init() {
        super.init(frame: .zero)
        backgroundColor = .white
        isAccessibilityElement = true
        accessibilityLabel = "The Makeup Store, Wangkhei. Opening store."
        mark.translatesAutoresizingMaskIntoConstraints = false
        addSubview(mark)
        nameLabel.text = "The Makeup Store"
        nameLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        nameLabel.font = UIFontMetrics(forTextStyle: .title3).scaledFont(for: .systemFont(ofSize: 22, weight: .medium), maximumPointSize: 28)
        locationLabel.text = "Wangkhei"
        locationLabel.textColor = UIColor(red: 100/255, green: 116/255, blue: 139/255, alpha: 1)
        locationLabel.font = UIFontMetrics(forTextStyle: .subheadline).scaledFont(for: .systemFont(ofSize: 14), maximumPointSize: 18)
        [nameLabel, locationLabel].forEach { label in
            label.translatesAutoresizingMaskIntoConstraints = false; label.textAlignment = .center
            label.adjustsFontForContentSizeCategory = true; addSubview(label)
        }
        let nameTop = nameLabel.topAnchor.constraint(equalTo: centerYAnchor, constant: 90)
        nameTop.priority = .defaultHigh
        NSLayoutConstraint.activate([
            mark.widthAnchor.constraint(equalToConstant: 288), mark.heightAnchor.constraint(equalToConstant: 288),
            mark.centerXAnchor.constraint(equalTo: centerXAnchor), mark.centerYAnchor.constraint(equalTo: centerYAnchor),
            nameLabel.centerXAnchor.constraint(equalTo: centerXAnchor), nameTop,
            nameLabel.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 20),
            nameLabel.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -20),
            locationLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 9),
            locationLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            locationLabel.bottomAnchor.constraint(lessThanOrEqualTo: safeAreaLayoutGuide.bottomAnchor, constant: -16)
        ])
        for _ in strokes {
            let base = CAShapeLayer(), accent = CAShapeLayer()
            for layer in [base, accent] { layer.fillColor = UIColor.clear.cgColor; layer.lineCap = .round; mark.layer.addSublayer(layer) }
            base.strokeColor = UIColor.black.cgColor
            accent.strokeColor = UIColor(red: 252/255, green: 39/255, blue: 121/255, alpha: 1).cgColor
            accent.strokeStart = 0; accent.strokeEnd = 0
            bases.append(base); accents.append(accent)
        }
        for event in [UIApplication.didBecomeActiveNotification, UIAccessibility.reduceMotionStatusDidChangeNotification] {
            observers.append(NotificationCenter.default.addObserver(forName: event, object: nil, queue: .main) { [weak self] _ in self?.play() })
        }
        observers.append(NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in self?.stop() })
    }
    required init?(coder: NSCoder) { fatalError("Use init()") }

    override func layoutSubviews() {
        super.layoutSubviews()
        let scale = mark.bounds.width / 432
        CATransaction.begin(); CATransaction.setDisableActions(true)
        for (index, stroke) in strokes.enumerated() {
            let path = UIBezierPath()
            path.move(to: CGPoint(x: (stroke.0.x + 24.18) * scale, y: (stroke.0.y + 24.18) * scale))
            path.addLine(to: CGPoint(x: (stroke.1.x + 24.18) * scale, y: (stroke.1.y + 24.18) * scale))
            for layer in [bases[index], accents[index]] { layer.frame = mark.bounds; layer.path = path.cgPath; layer.lineWidth = 17.9532 * scale }
        }
        CATransaction.commit()
    }
    override func didMoveToWindow() { super.didMoveToWindow(); if window == nil { stop() } else { play() } }

    private func play() {
        stop()
        guard window != nil, !UIAccessibility.isReduceMotionEnabled else { return }
        for (index, layer) in accents.enumerated() {
            let end = CABasicAnimation(keyPath: "strokeEnd"), start = CABasicAnimation(keyPath: "strokeStart")
            end.fromValue = 0; end.toValue = 1; end.duration = 0.4; end.beginTime = Double(index) * 0.06
            start.fromValue = 0; start.toValue = 1; start.duration = 0.4; start.beginTime = Double(index) * 0.06 + 0.18
            for animation in [start, end] {
                animation.fillMode = .forwards; animation.isRemovedOnCompletion = false
                animation.timingFunction = CAMediaTimingFunction(controlPoints: 0.4, 0, 0.2, 1)
            }
            let group = CAAnimationGroup(); group.animations = [start, end]; group.duration = 1.72; group.repeatCount = .infinity
            layer.add(group, forKey: "brandTrace")
        }
        nameLabel.alpha = 0; locationLabel.alpha = 0; nameLabel.transform = CGAffineTransform(translationX: 0, y: 6)
        UIView.animate(withDuration: 0.28, delay: 0.1, options: [.allowUserInteraction], animations: { self.nameLabel.alpha = 1; self.nameLabel.transform = .identity })
        UIView.animate(withDuration: 0.28, delay: 0.18, options: [.allowUserInteraction], animations: { self.locationLabel.alpha = 1 })
    }
    func stop() {
        accents.forEach { $0.removeAllAnimations() }
        [nameLabel, locationLabel].forEach { $0.layer.removeAllAnimations(); $0.alpha = 1; $0.transform = .identity }
    }
    deinit { observers.forEach { NotificationCenter.default.removeObserver($0) } }
}
