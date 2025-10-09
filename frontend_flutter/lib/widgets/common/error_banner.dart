import 'package:flutter/material.dart';

class ErrorBanner extends StatelessWidget {
  final String message;
  final VoidCallback? onDismiss;
  final VoidCallback? onRetry;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? textColor;

  const ErrorBanner({
    Key? key,
    required this.message,
    this.onDismiss,
    this.onRetry,
    this.icon,
    this.backgroundColor,
    this.textColor,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: backgroundColor ?? Colors.red[100],
        border: Border(
          left: BorderSide(
            color: Colors.red[600]!,
            width: 4,
          ),
        ),
      ),
      child: Row(
        children: [
          Icon(
            icon ?? Icons.error,
            color: Colors.red[600],
            size: 20,
          ),
          SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: textColor ?? Colors.red[800],
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (onRetry != null) ...[
                TextButton(
                  onPressed: onRetry,
                  child: Text(
                    'Reintentar',
                    style: TextStyle(
                      color: Colors.red[700],
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                SizedBox(width: 4),
              ],
              if (onDismiss != null)
                IconButton(
                  onPressed: onDismiss,
                  icon: Icon(
                    Icons.close,
                    color: Colors.red[600],
                    size: 18,
                  ),
                  constraints: BoxConstraints(),
                  padding: EdgeInsets.all(4),
                ),
            ],
          ),
        ],
      ),
    );
  }
}