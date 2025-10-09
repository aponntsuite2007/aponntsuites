import 'package:flutter/material.dart';
import '../../config/theme.dart';

class AponntLogo extends StatelessWidget {
  final double? size;
  final bool showText;
  final Color? color;
  final bool isLight;

  const AponntLogo({
    Key? key,
    this.size,
    this.showText = true,
    this.color,
    this.isLight = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final logoSize = size ?? 60.0;
    final textSize = logoSize * 0.4;
    final logoColor = color ?? (isLight ? Colors.white : AppTheme.primaryColor);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: logoSize,
          height: logoSize,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                logoColor,
                logoColor.withOpacity(0.7),
              ],
            ),
            borderRadius: BorderRadius.circular(logoSize * 0.2),
            boxShadow: [
              BoxShadow(
                color: logoColor.withOpacity(0.3),
                blurRadius: logoSize * 0.1,
                offset: Offset(0, logoSize * 0.05),
              ),
            ],
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Elemento principal del logo
              Container(
                width: logoSize * 0.6,
                height: logoSize * 0.6,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(logoSize * 0.15),
                ),
                child: Center(
                  child: Icon(
                    Icons.fingerprint,
                    size: logoSize * 0.35,
                    color: logoColor,
                  ),
                ),
              ),
              // Acento decorativo
              Positioned(
                top: logoSize * 0.1,
                right: logoSize * 0.1,
                child: Container(
                  width: logoSize * 0.15,
                  height: logoSize * 0.15,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.8),
                    borderRadius: BorderRadius.circular(logoSize * 0.075),
                  ),
                ),
              ),
            ],
          ),
        ),
        if (showText) ...[
          SizedBox(width: logoSize * 0.2),
          Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              RichText(
                text: TextSpan(
                  children: [
                    TextSpan(
                      text: 'A',
                      style: TextStyle(
                        fontSize: textSize * 0.85, // Achicar letras
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF87CEEB), // Azul claro
                        letterSpacing: -0.5,
                      ),
                    ),
                    TextSpan(
                      text: 'ponnt',
                      style: TextStyle(
                        fontSize: textSize * 0.85, // Achicar letras
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                'Suite de Asistencia',
                style: TextStyle(
                  fontSize: textSize * 0.5,
                  color: logoColor.withOpacity(0.7),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}

class AponntLogoIcon extends StatelessWidget {
  final double size;
  final Color? color;

  const AponntLogoIcon({
    Key? key,
    this.size = 32.0,
    this.color,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final logoColor = color ?? AppTheme.primaryColor;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            logoColor,
            logoColor.withOpacity(0.8),
          ],
        ),
        borderRadius: BorderRadius.circular(size * 0.2),
      ),
      child: Center(
        child: Icon(
          Icons.fingerprint,
          size: size * 0.6,
          color: Colors.white,
        ),
      ),
    );
  }
}

class AponntSplashLogo extends StatefulWidget {
  final VoidCallback? onAnimationComplete;

  const AponntSplashLogo({Key? key, this.onAnimationComplete}) : super(key: key);

  @override
  _AponntSplashLogoState createState() => _AponntSplashLogoState();
}

class _AponntSplashLogoState extends State<AponntSplashLogo>
    with TickerProviderStateMixin {
  late AnimationController _scaleController;
  late AnimationController _fadeController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();

    _scaleController = AnimationController(
      duration: Duration(milliseconds: 1000),
      vsync: this,
    );

    _fadeController = AnimationController(
      duration: Duration(milliseconds: 800),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _scaleController,
      curve: Curves.elasticOut,
    ));

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeInOut,
    ));

    _startAnimation();
  }

  void _startAnimation() async {
    await _scaleController.forward();
    await Future.delayed(Duration(milliseconds: 300));
    await _fadeController.forward();
    
    if (widget.onAnimationComplete != null) {
      widget.onAnimationComplete!();
    }
  }

  @override
  void dispose() {
    _scaleController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedBuilder(
            animation: _scaleAnimation,
            builder: (context, child) {
              return Transform.scale(
                scale: _scaleAnimation.value,
                child: AponntLogo(
                  size: 120,
                  showText: false,
                ),
              );
            },
          ),
          SizedBox(height: 30),
          AnimatedBuilder(
            animation: _fadeAnimation,
            builder: (context, child) {
              return Opacity(
                opacity: _fadeAnimation.value,
                child: Column(
                  children: [
                    Text(
                      'Aponnt',
                      style: TextStyle(
                        fontSize: 36,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryColor,
                        letterSpacing: -1,
                      ),
                    ),
                    SizedBox(height: 8),
                    Text(
                      'Suite de Asistencia Biométrica',
                      style: TextStyle(
                        fontSize: 16,
                        color: AppTheme.textSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    SizedBox(height: 20),
                    SizedBox(
                      width: 40,
                      height: 4,
                      child: LinearProgressIndicator(
                        backgroundColor: AppTheme.primaryColor.withOpacity(0.2),
                        valueColor: AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}